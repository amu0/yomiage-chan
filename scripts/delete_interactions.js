const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
require("dotenv").config();

const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationGuildCommands(process.env.DEBUG_CLIENT_ID, process.env.DEBUG_GUILD_ID), { body: [] })
	.then(() => console.log("削除が完了しました"))
	.catch(console.error);