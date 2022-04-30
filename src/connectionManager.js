"use strict";
const voice = require("@discordjs/voice");
const axios = require("axios");
const Speaker = require("../models/speaker");
const Guild = require("../models/guild");
const VOICEVOX_URL = process.env.VOICEVOX_URL;

class connectionManager {

  connection = null;
  player = null;
  readingCh = null;
  readQueue = [];

  constructor(interaction) {
    const memberVC = interaction.member.voice.channel;

    // VoiceConnection を作成
    const joinConfig = {
      adapterCreator: interaction.guild.voiceAdapterCreator,
      guildId: interaction.guildId,
      channelId: memberVC.id
    };
    this.connection = voice.joinVoiceChannel(joinConfig);
    this.readingCh = interaction.channel;

    // AudioPlayer を作成
    this.player = voice.createAudioPlayer();
    this.player.addListener("stateChange", (oldState, newState) => {
      if (newState.status === voice.AudioPlayerStatus.Idle) {
        // 同じユーザーの連続したメッセージは、名前の読み上げをしない
        if (this.readQueue[1] &&
          this.readQueue[0].userName === this.readQueue[1].userName
        ) {
          this.readQueue[1].userName = "";
        }

        this.readQueue.shift();
        this.readMsg();
      }
    });
    this.connection.subscribe(this.player);

    interaction.reply({ content: "接続しました" });
  }

  isConnecting() {
    const connectionStatus = this.connection ? this.connection.state.status : null;
    switch (connectionStatus) {
      case "signalling":
      case "connecting":
      case "ready":
        return true;
      default:
        return false;
    }
  }

  async messageProcessor(msg) {
    if (!this.isConnecting() || msg.channelId !== this.readingCh.id) return;
    const content = msg.content.length > 255 ? msg.content.slice(0, 128) + "、以下略" : msg.content;
    const speakerId = await Speaker.findOne({
      attributes: ["speakerId"],
      where: {
        userId: msg.member.user.id,
        guildId: msg.guildId
      }
    }).then((model) => {
      try {
        return model.getDataValue("speakerId") || 0;
      } catch {
        return 0;
      }
    });

    // 名前の読み上げを行うか、DBに問い合わせる
    const readName = await Guild.findOne({
      attributes: ["readName"],
      where: { guildId: msg.guildId }
    }).then((model) => {
      if (model !== null && model.getDataValue("readName") !== null) {
        return model.getDataValue("readName");
      } else {
        return true;
      }
    });

    this.readMsg({
      userName: readName ? msg.member.displayName : "",
      message: content,
      speakerId: speakerId
    });
  }

  readMsg(msg) {
    if (msg) this.readQueue.push(msg);

    console.log("readMsg: " + msg, this.readQueue, this.player.state.status);

    if (this.readQueue.length === 0 || this.player.state.status !== voice.AudioPlayerStatus.Idle) return;

    const readMsg = this.readQueue[0];
    const text = readMsg.userName === "" ? readMsg.message : `${readMsg.userName}、${readMsg.message}`

    axios({
      method: "post",
      url: "/audio_query",
      baseURL: VOICEVOX_URL,
      params: {
        text: text,
        speaker: readMsg.speakerId
      }
    }).then((res) => {
      axios({
        method: "post",
        url: "/synthesis",
        baseURL: VOICEVOX_URL,
        params: {
          speaker: readMsg.speakerId
        },
        data: res.data,
        responseType: "stream"
      }).then((res) => {
        // AudioResource を作って、再生する
        const resource = voice.createAudioResource(res.data);
        this.player.play(resource);
      }).catch((err) => {
        console.error(err);
      });
    }).catch((err) => {
      console.error(err);
    });
  }
}

module.exports = connectionManager;