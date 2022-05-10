const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbedMessage, disconnect } = require("../util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("読み上げを終了します"),
  async execute(interaction) {
    const connectionManagers = interaction.client.connectionManagers;
    const manager = connectionManagers.get(interaction.guildId);
    if (manager) {
      await disconnect(connectionManagers, interaction.guildId);
      interaction.reply(createEmbedMessage("info", "読み上げを終了しました"));
    } else {
      interaction.reply(createEmbedMessage("error", "既に切断しています"));
    }
  }
}