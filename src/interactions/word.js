const { SlashCommandBuilder, SlashCommandStringOption } = require("@discordjs/builders");
const { createEmbedMessage } = require("../util");
const Dictionary = require("../../models/dictionary");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("word")
    .setDescription("単語を登録・編集します")
    .addStringOption(new SlashCommandStringOption()
      .setName("単語")
      .setDescription("単語を入力してください")
      .setRequired(true)
    )
    .addStringOption(new SlashCommandStringOption()
      .setName("読み")
      .setDescription("読み（空白の場合は単語を削除します）")
    ),

  async execute(interaction) {
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
}