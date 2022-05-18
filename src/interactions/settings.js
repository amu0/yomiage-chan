const { SlashCommandBuilder, SlashCommandBooleanOption } = require("@discordjs/builders");
const Guild = require("../../models/guild");
const { createEmbedMessage } = require("../util");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("各種設定を行います")
    .addBooleanOption(new SlashCommandBooleanOption()
      .setName("名前の読み上げ")
      .setDescription("名前の読み上げの設定")
    )
    .addBooleanOption(new SlashCommandBooleanOption()
      .setName("入退出の読み上げ")
      .setDescription("入退出の読み上げの設定")
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has("ADMINISTRATOR")) return interaction.reply(createEmbedMessage("error", "このコマンドは管理者のみ利用可能です"));

    if (interaction.options.getBoolean("名前の読み上げ") !== null) {
      await Guild.upsert({
        guildId: interaction.guildId,
        readName: interaction.options.getBoolean("名前の読み上げ")
      });
    }
    if (interaction.options.getBoolean("入退出の読み上げ") !== null) {
      await Guild.upsert({
        guildId: interaction.guildId,
        joinLeftCheck: interaction.options.getBoolean("入退出の読み上げ")
      });
    }

    const settings = await Guild.findByPk(interaction.guildId);
    const isReadName = settings.get("readName") === null ?
      "true" : settings.get("readName").toString();
    const isJoinLeftCheck = settings.get("joinLeftCheck") === null ?
      "true" : settings.get("joinLeftCheck").toString();

    interaction.reply({
      embeds: [{
        title: "INFO",
        description: "設定しました",
        fields: [
          {
            name: "名前の読み上げ",
            value: isReadName,
            inline: true
          },
          {
            name: "入退出の読み上げ",
            value: isJoinLeftCheck,
            inline: true
          }
        ],
        color: "43a1ec",
        timestamp: new Date()
      }]
    });
  }
}