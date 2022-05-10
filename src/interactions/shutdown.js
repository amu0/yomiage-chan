const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbedMessage, disconnect } = require("../util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shutdown")
    .setDescription("BOTをシャットダウンします。オーナーのみ利用可能です"),
  async execute(interaction) {
    const OWNER_ID = process.env.OWNER_ID;
    if (interaction.user.id !== OWNER_ID) return interaction.reply(createEmbedMessage("error", "このコマンドはオーナーのみ利用可能です"));

    await interaction.reply(createEmbedMessage("info", "シャットダウン処理を開始します"));

    let promises = [];
    const connectionManagers = interaction.client.connectionManagers;
    connectionManagers.forEach((manager, guildId) => {
      promises.push(new Promise(async (resolve) => {
        await manager.readingCh.send(createEmbedMessage("info", "BOTがシャットダウンされます"));
        await disconnect(connectionManagers, guildId);
        resolve();
      }));
    });

    Promise.all(promises).then(() => {
      console.log("シャットダウンします");
      process.exit(0);
    });
  }
}