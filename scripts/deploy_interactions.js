const fs = require("fs");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
require("dotenv").config();

const interactions = [];
const interactionFiles = fs.readdirSync("./src/interactions").filter(file => file.endsWith(".js"));

for (const file of interactionFiles) {
  const interaction = require(`../src/interactions/${file}`);
  interactions.push(interaction.data.toJSON());
}

const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.DEBUG_CLIENT_ID, process.env.DEBUG_GUILD_ID), { body: interactions })
  .then(() => console.log("完了しました"))
  .catch(console.error);