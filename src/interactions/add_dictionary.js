const fs = require("fs");
const readline = require("readline");
const https = require("https");
const { ContextMenuCommandBuilder } = require("@discordjs/builders");
const { createEmbedMessage } = require("../util");
const Dictionary = require("../../models/dictionary");
const { ApplicationCommandType } = require("discord-api-types/v10");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("add_dictionary")
    .setType(ApplicationCommandType.Message),

  async execute(interaction) {
    await interaction.reply(createEmbedMessage("info", "辞書のインポートを開始します"));
    const attachments = interaction.targetMessage.attachments;
    if (attachments.size !== 1) return interaction.editReply(createEmbedMessage("error", "ファイルを一つだけ指定してください"));
    if (!attachments.first().name.endsWith(".dict")) return interaction.editReply(createEmbedMessage("error", "dictファイルを指定してください"));

    const url = attachments.first().attachment;
    const fileName = `${attachments.first().name}_${interaction.guildId}_${new Date().getTime()}`;

    // ファイルをダウンロード
    await new Promise((resolve, reject) => {
      https.request(url, (res) => {
        res
          .pipe(fs.createWriteStream(fileName))
          .on("close", resolve)
          .on("error", reject);
      })
        .end();
    });

    const stream = fs.createReadStream(fileName, { encoding: "utf16le" });
    stream.on("error", (err) => console.error(err));

    const reader = readline.createInterface({ input: stream });

    let words = [];
    reader.on("line", (data) => {
      if (data.split(",").length !== 2) return;
      words.push({
        guildId: interaction.guildId,
        word: data.split(",")[0].trim(),
        reading: data.split(",")[1].trim()
      });
    });

    await new Promise((resolve) => {
      reader.on("close", () => {
        Dictionary.bulkCreate(words, {
          updateOnDuplicate: ["guildId", "word"]
        }).then(resolve);
      });
    });

    fs.unlink(fileName, (err) => {
      if (err) console.error(err);
    });

    interaction.editReply(createEmbedMessage("info", "辞書のインポートが完了しました"));
  }
}