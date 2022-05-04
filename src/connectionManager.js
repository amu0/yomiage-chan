"use strict";
const voice = require("@discordjs/voice");
const axios = require("axios");
const Speaker = require("../models/speaker");
const Guild = require("../models/guild");
const Dictionary = require("../models/dictionary");
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

  async messageProcessor(rawMsg) {
    if (!this.isConnecting() || rawMsg.channelId !== this.readingCh.id) return;
    // 長いメッセージは省略する
    let message = rawMsg.content.replaceAll(/https?:\/\/[\w!?/+\-_~;.,*&@#$%()'[\]]+/g, "ユーアールエル");
    message = message.length > 255 ? message.slice(0, 128) + "、以下略" : message;

    // 添付ファイル
    let attachmentTypes = [];
    await rawMsg.attachments.forEach((attachment) => {
      const type = attachment.contentType;

      if (type === null && !attachmentTypes.includes("ファイル")) {
        attachmentTypes.push("ファイル");
        return;
      }

      if (type.startsWith("image")) {
        if (!attachmentTypes.includes("画像")) attachmentTypes.push("画像");
      } else if (type.startsWith("video")) {
        if (!attachmentTypes.includes("動画")) attachmentTypes.push("動画");
      } else if (type.startsWith("audio")) {
        if (!attachmentTypes.includes("音声")) attachmentTypes.push("音声");
      } else if (!attachmentTypes.includes("ファイル")) {
        attachmentTypes.push("ファイル");
      }
    });
    message = `${message}。${attachmentTypes.join("と")}`

    const speakerId = await Speaker.findOne({
      attributes: ["speakerId"],
      where: {
        userId: rawMsg.member.user.id,
        guildId: rawMsg.guildId
      }
    }).then((model) => {
      if (model === null) {
        return 0;
      } else {
        return model.getDataValue("speakerId") || 0;
      }
    });

    // 名前の読み上げを行うか、DBに問い合わせる
    const isReadName = await Guild.findOne({
      attributes: ["readName"],
      where: { guildId: rawMsg.guildId }
    }).then((model) => {
      if (model !== null && model.getDataValue("readName") !== null) {
        return model.getDataValue("readName");
      } else {
        return true;
      }
    });

    this.readMsg({
      userName: isReadName ? rawMsg.member.displayName : "",
      message: message,
      speakerId: speakerId,
      guildId: rawMsg.guildId
    });
  }

  async readMsg(msg) {
    if (msg) this.readQueue.push(msg);

    if (this.readQueue.length === 0 || this.player.state.status !== voice.AudioPlayerStatus.Idle) return;

    const readMsg = this.readQueue[0];
    let text = readMsg.userName === "" ? readMsg.message : `${readMsg.userName}、${readMsg.message}`

    // 辞書による置き換え
    let promises = [];
    await Dictionary.findAll({
      where: { guildId: readMsg.guildId },
      attributes: ["word", "reading"]
    }).then((words) => {
      words.forEach((word) => {
        const promise = new Promise((resolve) => {
          try {
            text = text.toLowerCase().replaceAll(word.getDataValue("word"), word.getDataValue("reading"));
          } catch (e) {
            console.error("辞書による置き換えに失敗しました: " + e);
          }
          resolve();
        });
        promises.push(promise);
      });
    });

    await Promise.all(promises);
    if (text.length > 255) text = text.slice(0, 128) + "、以下略";

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