require("dotenv").config();
const fs = require("fs");
const discordjs = require("discord.js");
const voice = require("@discordjs/voice");
const connectionManager = require("./src/connectionManager");
const { exportDictionary, importDictionary, createEmbedMessage } = require("./src/util")

const OWNER_ID = process.env.OWNER_ID;

const client = new discordjs.Client({ intents: Object.keys(discordjs.Intents.FLAGS) });

let connectionManagers = new Map();// key: guildId, value: connectionManager

// DB
const Speaker = require("./models/speaker");
const Guild = require("./models/guild");
const Dictionary = require("./models/dictionary");
Speaker.sync();
Guild.sync();
Dictionary.sync();

client.once("ready", async () => {
  console.log(`${client.user.tag}でログインしています。`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  // 辞書のインポート
  if (interaction.commandName === "辞書として追加") {
    await interaction.reply(createEmbedMessage("info", "辞書のインポートを開始します"));
    const attachments = interaction.targetMessage.attachments;
    if (attachments.size !== 1) return interaction.editReply(createEmbedMessage("error", "ファイルを一つだけ指定してください"));

    const url = attachments.first().attachment;
    const fileName = attachments.first().name;
    if (!fileName.endsWith(".dict")) return interaction.editReply(createEmbedMessage("error", "dictファイルを指定してください"));

    await importDictionary(url, fileName, interaction.guildId)
    fs.unlink(fileName, (err) => {
      if (err) console.error(err);
    });
    interaction.editReply(createEmbedMessage("info", "辞書のインポートが完了しました"));
  }

  // スラッシュコマンド
  if (!interaction.isCommand) return;
  const cmdName = interaction.commandName;
  const manager = connectionManagers.get(interaction.guildId);

  // 読み上げを開始
  if (cmdName === "join") {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply(createEmbedMessage("error", "先にVCに接続してください"));
    if (!voiceChannel.joinable) return interaction.reply(createEmbedMessage("error", "BOTがVCに接続できません"));
    if (!voiceChannel.speakable) return interaction.reply(createEmbedMessage("error", "BOTにVCの発言権を与えてください"));

    if (manager && manager.isConnecting()) {
      return interaction.reply(createEmbedMessage("error", "既に接続しています"));
    } else {
      connectionManagers.set(
        interaction.guildId,
        new connectionManager(interaction)
      );
    }
  }

  // 読み上げを終了
  if (cmdName === "leave") {
    if (manager) {
      await disconnect(interaction.guildId);
      interaction.reply(createEmbedMessage("info", "読み上げを終了しました"));
    } else {
      interaction.reply(createEmbedMessage("error", "既に切断しています"));
    }
  }

  // 話者設定
  if (cmdName === "speaker") {
    await Speaker.upsert({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      speakerId: interaction.options.getNumber("speaker")
    });
    interaction.reply(createEmbedMessage("info", "話者を設定しました"));
  }

  // Guild設定
  if (cmdName === "settings") {
    if (interaction.options.getBoolean("read_name") !== null) {
      await Guild.upsert({
        guildId: interaction.guildId,
        readName: interaction.options.getBoolean("read_name")
      })
    }
    if (interaction.options.getBoolean("join_left_check") !== null) {
      await Guild.upsert({
        guildId: interaction.guildId,
        joinLeftCheck: interaction.options.getBoolean("join_left_check")
      });
    }
    const settings = await Guild.findByPk(interaction.guildId);
    const isReadName = settings.get("readName") === null ?
      "true" : settings.get("readName").toString();
    const isJoinLeftCheck = settings.get("joinLeftCheck") === null ?
      "true" : settings.get("joinLeftCheck").toString();

    interaction.reply({
      embeds: [{
        title: "INFO",
        description: "設定しました",
        fields: [
          {
            name: "名前の読み上げ",
            value: isReadName,
            inline: true
          },
          {
            name: "入退出の読み上げ",
            value: isJoinLeftCheck,
            inline: true
          }
        ],
        color: "43a1ec",
        timestamp: new Date()
      }]
    });
  }

  // 辞書登録・削除
  if (cmdName === "word") {
    const word = interaction.options.getString("単語");
    const reading = interaction.options.getString("読み");

    if (word.length > 255 || (reading && reading.length > 255)) {
      return interaction.reply(createEmbedMessage("error", "単語と読みはそれぞれ255文字以内で設定してください"));
    }

    if (reading === null) {
      Dictionary.destroy({
        where: [{
          guildId: interaction.guildId,
          word: word
        }]
      }).then((number) => {
        if (number === 0) {
          interaction.reply(createEmbedMessage("error", "削除対象の単語が見つかりませんでした"));
        } else {
          interaction.reply(createEmbedMessage("info", "単語を削除しました"));
        }
      });
    } else {
      Dictionary.upsert({
        guildId: interaction.guildId,
        word: word,
        reading: reading
      }).then((model) => {
        interaction.reply({
          embeds: [{
            title: "INFO",
            description: "単語を設定しました",
            fields: [
              {
                name: "単語",
                value: model[0].getDataValue("word"),
                inline: true
              },
              {
                name: "読み",
                value: model[0].getDataValue("reading"),
                inline: true
              }
            ],
            color: "43a1ec",
            timestamp: new Date()
          }]
        });
      });
    }
  }

  // Shutdown
  if (cmdName === "shutdown") {
    if (interaction.user.id !== OWNER_ID) return interaction.reply(createEmbedMessage("error", "このコマンドはオーナーのみ利用可能です"));

    await interaction.reply(createEmbedMessage("info", "シャットダウン処理を開始します"));

    let promises = [];
    connectionManagers.forEach((manager, guildId) => {
      promises.push(new Promise(async (resolve) => {
        await manager.readingCh.send(createEmbedMessage("info", "BOTがシャットダウンされます"));
        await disconnect(guildId);
        resolve();
      }));
    });

    Promise.all(promises).then(() => {
      console.log("シャットダウンします");
      process.exit(0);
    });
  }

  // 辞書の出力
  if (cmdName === "dictionary" && interaction.options.getSubcommand() === "export") {
    const fileName = await exportDictionary(interaction.guildId);
    await interaction.reply({ files: [fileName] });
    fs.unlink(fileName, (err) => {
      if (err) console.error(err);
    });
  }

  // 辞書の削除
  if (cmdName === "dictionary" && interaction.options.getSubcommand() === "delete") {
    await interaction.reply(createEmbedMessage("info", "辞書を削除します"));

    Dictionary.destroy({
      where: { guildId: interaction.guildId }
    }).then(() => {
      interaction.editReply(createEmbedMessage("info", "辞書の削除が完了しました"));
    });
  }

  // ヘルプ
  if (cmdName === "help") {
    interaction.reply({
      embeds: [{
        title: "ヘルプ",
        color: "43a1ec",
        timestamp: new Date(),
        fields: [
          {
            name: "`/join`",
            value: "読み上げを開始します"
          },
          {
            name: "`/leave`",
            value: "読み上げを終了します"
          },
          {
            name: "`/word`",
            value: "単語を辞書に登録します。「読み」が空欄の場合は単語を削除します（サーバーごと）"
          },
          {
            name: "`/speaker`",
            value: "自分のメッセージを読み上げる話者を設定します（サーバーごと）"
          },
          {
            name: "`/settings`",
            value: "「read_name」は名前の読み上げを、「join_left_check」は入退出の読み上げと通知を、設定します（サーバーごと）"
          },
          {
            name: "`/dictionary export`",
            value: "辞書を出力します"
          },
          {
            name: "`/dictionary delete`",
            value: "辞書を削除します"
          },
          {
            name: "`「メッセージのメニュー」→「アプリ」→「辞書として追加」`",
            value: "辞書をインポートします"
          }
        ]
      }]
    });
  }
});


client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content.toLowerCase() === "!set_cmd") return setCommands(message);
  if (message.content.toLowerCase() === "!del_cmd") {
    await client.application.commands.set([], message.guildId);
    message.reply(createEmbedMessage("info", "コマンドを削除しました"));
  }

  const manager = connectionManagers.get(message.guildId);
  if (manager) manager.messageProcessor(message);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const oldStateCh = oldState.channel
  const manager = connectionManagers.get(oldState.guild.id || newState.guild.id);

  // 接続中のVCから誰もいなくなった場合は切断する
  if (oldStateCh && oldStateCh.members.has(client.user.id) && oldStateCh.members.size < 2) {
    manager.readingCh.send({
      embeds: [{
        title: "INFO",
        description: "誰もいなくなったので読み上げを終了します",
        color: "43a1ec",
        timestamp: new Date()
      }]
    });

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
    const joinLeftCheck = await Guild.findByPk(oldState.guild.id, {
      attributes: ["joinLeftCheck"]
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
        speakerId: 0,
        guildId: newState.guild.id
      });

      manager.readingCh.send({
        embeds: [{
          author: {
            name: msg,
            icon_url: newState.member.displayAvatarURL()
          },
          color: "00ff00",
          timestamp: new Date()
        }]
      });
    }

    // ユーザーが退出
    if (oldStateCh && oldStateCh.members.has(client.user.id)
      && oldState.member.user.id !== client.user.id) {
      const msg = `${newState.member.displayName}が退出`;
      manager.readMsg({
        userName: "",
        message: msg,
        speakerId: 0,
        guildId: oldState.guild.id
      });
      manager.readingCh.send({
        embeds: [{
          author: {
            name: msg,
            icon_url: newState.member.displayAvatarURL()
          },
          color: "ff0000",
          timestamp: new Date()
        }]
      });
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
      name: "help",
      description: "ヘルプを表示します"
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
      name: "word",
      description: "単語を登録・編集します",
      options: [
        {
          name: "単語",
          description: "単語を入力してください",
          type: "STRING",
          required: true
        },
        {
          name: "読み",
          description: "読み（空白の場合は単語を削除します）",
          type: "STRING"
        }
      ]
    },
    {
      name: "shutdown",
      description: "BOTをシャットダウンします。オーナーのみ利用可能です"
    },
    {
      name: "dictionary",
      description: "辞書の設定をします",
      options: [
        {
          name: "export",
          description: "辞書を出力します",
          type: "SUB_COMMAND"
        },
        {
          name: "delete",
          description: "辞書を削除します",
          type: "SUB_COMMAND"
        }
      ]
    },
    {
      name: "辞書として追加",
      description: "",
      type: "MESSAGE"
    }
  ];

  client.application.commands.set(data, message.guildId)
    .then(() => {
      message.reply(createEmbedMessage("info", "コマンドを設定しました"));
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