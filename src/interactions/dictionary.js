const fs = require("fs");
const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const { createEmbedMessage } = require("../util");
const Dictionary = require("../../models/dictionary");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dictionary")
    .setDescription("辞書の設定をします")
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName("export")
      .setDescription("辞書を出力します")
    )
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName("delete")
      .setDescription("辞書を削除します")
    ),
  async execute(interaction) {
    const guildId = interaction.guildId;
    switch (interaction.options.getSubcommand()) {
      case "export":
        await interaction.reply(createEmbedMessage("info", "辞書を出力します"));

        const fileName = `${guildId}_${new Date().getTime()}.dict`;

        const stream = fs.createWriteStream(fileName, { encoding: "utf16le" });
        stream.on("error", (err) => {
          console.error(err);
        });

        let promises = [];
        await Dictionary.findAll({
          where: { guildId: guildId },
          attributes: ["word", "reading"]
        }).then((words) => {
          words.forEach((word) => {
            const promise = new Promise((resolve) => {
              const text = word.getDataValue("word") + "," + word.getDataValue("reading");
              stream.write(text + "\n", () => { resolve() });
            });
            promises.push(promise);
          })
        });

        await Promise.all(promises);
        stream.end();

        await interaction.editReply(createEmbedMessage("info", "辞書の出力が完了しました"));
        await interaction.channel.send({ files: [fileName] });

        fs.unlink(fileName, (err) => {
          if (err) console.error(err);
        });
        break;

      case "delete":
        if (!interaction.memberPermissions.has("ADMINISTRATOR")) return interaction.reply(createEmbedMessage("error", "このコマンドは管理者のみ利用可能です"));

        await interaction.reply(createEmbedMessage("info", "辞書を削除します"));

        Dictionary.destroy({
          where: { guildId: interaction.guildId }
        }).then(() => {
          interaction.editReply(createEmbedMessage("info", "辞書の削除が完了しました"));
        });
        break;
    }
  }
}