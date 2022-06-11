const { SlashCommandBuilder, SlashCommandNumberOption } = require("@discordjs/builders");
const { createEmbedMessage } = require("../util");
const Speaker = require("../../models/speaker");
const { voicevox } = require("../../voicevox.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speaker")
    .setDescription("自分のメッセージを読み上げる話者を設定します")
    .addNumberOption(new SlashCommandNumberOption()
      .setName("話者")
      .setDescription("話者を選択してください")
      .setRequired(true)
      .addChoice(voicevox[2].name, 2)
      .addChoice(voicevox[0].name, 0)
      .addChoice(voicevox[6].name, 6)
      .addChoice(voicevox[4].name, 4)
      .addChoice(voicevox[3].name, 3)
      .addChoice(voicevox[1].name, 1)
      .addChoice(voicevox[7].name, 7)
      .addChoice(voicevox[5].name, 5)
      .addChoice(voicevox[8].name, 8)
      .addChoice(voicevox[10].name, 10)
      .addChoice(voicevox[9].name, 9)
      .addChoice(voicevox[11].name, 11)
      .addChoice(voicevox[12].name, 12)
      .addChoice(voicevox[13].name, 13)
      .addChoice(voicevox[14].name, 14)
      .addChoice(voicevox[16].name, 16)
      .addChoice(voicevox[15].name, 15)
      .addChoice(voicevox[18].name, 18)
      .addChoice(voicevox[17].name, 17)
      .addChoice(voicevox[19].name, 19)
      .addChoice(voicevox[20].name, 20)
    ),
  async execute(interaction) {
    const speakerId = interaction.options.getNumber("話者");
    await Speaker.upsert({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      speakerId: speakerId
    });

    const credit = voicevox[speakerId].credit ? voicevox[speakerId].credit : `VOICEVOX:${voicevox[speakerId]}`
    interaction.reply(createEmbedMessage("info",
      "話者を`" + credit + "`に設定しました\n" +
      `音源の利用規約は[こちら](${voicevox[speakerId].term})`
    ));
  }
}