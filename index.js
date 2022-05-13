require("dotenv").config();
const fs = require("fs");
const discordjs = require("discord.js");

const FLAGS = discordjs.Intents.FLAGS;
const client = new discordjs.Client({
  intents: [
    FLAGS.GUILDS,
    FLAGS.GUILD_MEMBERS,
    FLAGS.GUILD_VOICE_STATES,
    FLAGS.GUILD_MESSAGES
  ]
});

client.login(process.env.DISCORD_TOKEN);

client.connectionManagers = new Map();// key: guildId, value: connectionManager

// DB
const Speaker = require("./models/speaker");
const Guild = require("./models/guild");
const Dictionary = require("./models/dictionary");
Speaker.sync();
Guild.sync();
Dictionary.sync();

// EventHandlers
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
for (const file of eventFiles) {
  const event = require(`./src/events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(client, ...args));
  } else {
    client.on(event.name, (...args) => event.execute(client, ...args));
  }
}

// InteractionHandlers
client.interactions = new discordjs.Collection();
const interactionFiles = fs.readdirSync("./src/interactions").filter(file => file.endsWith(".js"));
for (const file of interactionFiles) {
  const interaction = require(`./src/interactions/${file}`);
  client.interactions.set(interaction.data.name, interaction);
}