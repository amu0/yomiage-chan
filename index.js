require("dotenv").config();
const fs = require("fs");
const discordjs = require("discord.js");
const voice = require("@discordjs/voice");
const connectionManager = require("./src/connectionManager");
const { exportDictionary, importDictionary, createEmbedMessage, disconnect } = require("./src/util")

const OWNER_ID = process.env.OWNER_ID;

const client = new discordjs.Client({ intents: Object.keys(discordjs.Intents.FLAGS) });

client.connectionManagers = new Map();// key: guildId, value: connectionManager

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

client.interactions = new discordjs.Collection();
const interactionFiles = fs.readdirSync("./src/interactions").filter(file => file.endsWith(".js"));
for (const file of interactionFiles) {
  const interaction = require(`./src/interactions/${file}`);
  client.interactions.set(interaction.data.name, interaction);
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) return;

  const interactionHandler = client.interactions.get(interaction.commandName);
  if (!interactionHandler) return;
  try {
    await interactionHandler.execute(interaction);
  } catch (error) {
    console.error(error);
  }
});

client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const manager = client.connectionManagers.get(message.guildId);
  if (manager) manager.messageProcessor(message);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const oldStateCh = oldState.channel
  const manager = client.connectionManagers.get(oldState.guild.id || newState.guild.id);

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

    await disconnect(connectionManagers, oldState.guild.id);
    return;
  }

  // BOTが切断された時にconnectionManagerを削除する
  if (newState.member.user.id === client.user.id
    && !newState.channel && client.connectionManagers.has(newState.guild.id)) {
    client.connectionManagers.delete(newState.guild.id);
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
