const { SlashCommandBuilder, SlashCommandNumberOption } = require("@discordjs/builders");
const { createEmbedMessage } = require("../util");
const Speaker = require("../../models/speaker");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("speaker")
    .setDescription("自分のメッセージを読み上げる話者を設定します")
    .addNumberOption(new SlashCommandNumberOption()
      .setName("話者")
      .setDescription("話者を選択してください")
      .setRequired(true)
      .addChoice("四国めたん（ノーマル）", 2)
      .addChoice("四国めたん（あまあま）", 0)
      .addChoice("四国めたん（ツンツン）", 6)
      .addChoice("四国めたん（セクシー）", 4)
      .addChoice("ずんだもん（ノーマル）", 3)
      .addChoice("ずんだもん（あまあま）", 1)
      .addChoice("ずんだもん（ツンツン）", 7)
      .addChoice("ずんだもん（セクシー）", 5)
      .addChoice("春日部つむぎ", 8)
      .addChoice("雨晴はう", 10)
      .addChoice("波音リツ", 9)
      .addChoice("玄野武宏", 11)
      .addChoice("白上虎太郎", 12)
      .addChoice("青山龍星", 13)
      .addChoice("冥鳴ひまり", 14)
      .addChoice("九州そら（ノーマル）", 16)
      .addChoice("九州そら（あまあま）", 15)
      .addChoice("九州そら（ツンツン）", 18)
      .addChoice("九州そら（セクシー）", 17)
      .addChoice("九州そら（ささやき）", 19)
    ),
  async execute(interaction) {
    await Speaker.upsert({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      speakerId: interaction.options.getNumber("話者")
    });
    interaction.reply(createEmbedMessage("info", "話者を設定しました"));
  }
}