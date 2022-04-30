require("dotenv").config();
const discordjs = require("discord.js");
const voice = require("@discordjs/voice");
const connectionManager = require("./src/connectionManager");

const OWNER_ID = process.env.OWNER_ID;

const client = new discordjs.Client({ intents: Object.keys(discordjs.Intents.FLAGS) });

let connectionManagers = new Map();// key: guildId, value: connectionManager

// DB
const Speaker = require("./models/speaker");
const Guild = require("./models/guild");
Speaker.sync();
Guild.sync();

client.once("ready", async () => {
  console.log(`${client.user.tag}でログインしています。`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand) return;
  if (!interaction.guild) return;
  const cmdName = interaction.commandName;
  const manager = connectionManagers.get(interaction.guildId);
  const voiceChannel = interaction.member.voice.channel;

  if (cmdName === "join") {
    if (!voiceChannel) return interaction.reply({ content: "先にVCに参加してください", ephemeral: true });
    if (!voiceChannel.joinable) return interaction.reply({ content: "BOTがVCに参加できません", ephemeral: true });
    if (!voiceChannel.speakable) return interaction.reply({ content: "BOTにVCの発言権がありません", ephemeral: true });

    if (manager) {
      if (manager.isConnecting()) return interaction.reply({ content: "既に接続しています", ephemeral: true });
    } else {
      connectionManagers.set(
        interaction.guildId,
        new connectionManager(interaction)
      );
    }
  }

  if (cmdName === "leave") {
    if (manager) {
      await disconnect(interaction.guildId);
      interaction.reply("切断しました");
    } else {
      interaction.reply({ content: "既に切断しています", ephemeral: true });
    }
  }

  if (cmdName === "speaker") {
    await Speaker.upsert({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      speakerId: interaction.options.getNumber("speaker")
    });
    interaction.reply(`話者を設定しました(${interaction.options.getNumber("speaker")})`);
  }

  if (cmdName === "settings") {
    if (interaction.options.getBoolean("read_name") !== null) {
      await Guild.upsert({
        guildId: interaction.guildId,
        readName: interaction.options.getBoolean("read_name")
      });
    }
    if (interaction.options.getBoolean("join_left_check") !== null) {
      await Guild.upsert({
        guildId: interaction.guildId,
        joinLeftCheck: interaction.options.getBoolean("join_left_check")
      });
    }
    interaction.reply("設定しました");
  }

  if (cmdName === "shutdown") {
    if (interaction.user.id !== OWNER_ID) return interaction.reply("このコマンドはオーナーのみ利用可能です");
    await interaction.reply("シャットダウン処理を開始します");

    let promises = [];
    connectionManagers.forEach((manager, guildId) => {
      promises.push(new Promise(async (resolve) => {
        await manager.readingCh.send("BOTがシャットダウンされます");
        await disconnect(guildId);
        console.log(guildId);
        resolve();
      }));
    });

    Promise.all(promises).then(() => {
      console.log("シャットダウンします");
      process.exit(0);
    });
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content.toLowerCase() === "!set_cmd") return setCommands(message);
  if (message.content.toLowerCase() === "!del_cmd") {
    await client.application.commands.set([], message.guildId);
    message.reply("コマンドを削除しました");
  }

  const manager = connectionManagers.get(message.guildId);
  if (manager) manager.messageProcessor(message);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const oldStateCh = oldState.channel
  const manager = connectionManagers.get(oldState.guild.id || newState.guild.id);
  if (oldStateCh && oldStateCh.members.has(client.user.id) && oldStateCh.members.size < 2) {
    manager.readingCh.send("読み上げを終了します");
    await disconnect(oldState.guild.id);
    return;
  }

  // BOTが切断された時にconnectionManagerを削除する
  if (newState.member.user.id === client.user.id
    && !newState.channel && connectionManagers.has(newState.guild.id)) {
    connectionManagers.delete(newState.guild.id);
  }

  // 入退出を読み上げ
  if (oldStateCh !== newState.channel) {
    const joinLeftCheck = await Guild.findOne({
      attributes: ["joinLeftCheck"],
      where: { guildId: oldState.guild.id }
    }).then((model) => {
      if (model !== null && model.getDataValue("joinLeftCheck") !== null) {
        return model.getDataValue("joinLeftCheck");
      } else {
        return true;
      }
    });
    if (!joinLeftCheck) return;

    // ユーザーが参加
    if (newState.channel && newState.channel.members.has(client.user.id)) {
      const msg = `${newState.member.displayName}が参加`;
      manager.readMsg({
        userName: "",
        message: msg,
        speakerId: 0
      });
      manager.readingCh.send(msg);
    }

    // ユーザーが退出
    if (oldStateCh && oldStateCh.members.has(client.user.id)
      && oldState.member.user.id !== client.user.id) {
      const msg = `${newState.member.displayName}が退出`;
      manager.readMsg({
        userName: "",
        message: msg,
        speakerId: 0
      });
      manager.readingCh.send(msg);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);

function setCommands(message) {
  const data = [
    {
      name: "join",
      description: "読み上げを開始します"
    },
    {
      name: "leave",
      description: "読み上げを終了します"
    },
    {
      name: "speaker",
      description: "自分のメッセージを読み上げる話者を設定します",
      options: [{
        name: "speaker",
        description: "話者を選択してください",
        type: "NUMBER",
        required: true,
        choices: [
          { name: "四国めたん（ノーマル）", value: 2 },
          { name: "四国めたん（あまあま）", value: 0 },
          { name: "四国めたん（ツンツン）", value: 6 },
          { name: "四国めたん（セクシー）", value: 4 },
          { name: "ずんだもん（ノーマル）", value: 3 },
          { name: "ずんだもん（あまあま）", value: 1 },
          { name: "ずんだもん（ツンツン）", value: 7 },
          { name: "ずんだもん（セクシー）", value: 5 },
          { name: "春日部つむぎ", value: 8 },
          { name: "雨晴はう", value: 10 },
          { name: "波音リツ", value: 9 },
          { name: "玄野武宏", value: 11 },
          { name: "白上虎太郎", value: 12 },
          { name: "青山龍星", value: 13 },
          { name: "冥鳴ひまり", value: 14 },
          { name: "九州そら（ノーマル）", value: 16 },
          { name: "九州そら（あまあま）", value: 15 },
          { name: "九州そら（ツンツン）", value: 18 },
          { name: "九州そら（セクシー）", value: 17 },
          { name: "九州そら（ささやき）", value: 19 }
        ]
      }]
    },
    {
      name: "settings",
      description: "各種設定を行います",
      options: [
        {
          name: "read_name",
          description: "名前の読み上げ",
          type: "BOOLEAN"
        },
        {
          name: "join_left_check",
          description: "ユーザーの入退出の読み上げ",
          type: "BOOLEAN"
        }
      ]
    },
    {
      name: "shutdown",
      description: "BOTをシャットダウンします。オーナーのみ利用可能です"
    }
  ];

  client.application.commands.set(data, message.guildId)
    .then(() => {
      message.reply("コマンドを設定しました");
    })
    .catch((error) => {
      console.log(error)
    });
}

async function disconnect(guildId) {
  const manager = connectionManagers.get(guildId);
  await manager.connection.destroy();
  connectionManagers.delete(guildId);
}