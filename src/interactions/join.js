const { SlashCommandBuilder } = require("@discordjs/builders");
const { createEmbedMessage } = require("../util");
const connectionManager = require("../connectionManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("読み上げを開始します"),
  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply(createEmbedMessage("error", "先にVCに接続してください"));
    if (!voiceChannel.joinable) return interaction.reply(createEmbedMessage("error", "BOTがVCに接続できません"));
    if (!voiceChannel.speakable) return interaction.reply(createEmbedMessage("error", "BOTにVCの発言権を与えてください"));
    if (interaction.channel.type === "GUILD_VOICE") return interaction.reply(createEmbedMessage("error", "VCチャットからは利用できません"));

    const manager = interaction.client.connectionManagers.get(interaction.guildId);
    if (manager && manager.isConnecting()) {
      return interaction.reply(createEmbedMessage("error", "既に接続しています"));
    } else {
      interaction.client.connectionManagers.set(
        interaction.guildId,
        new connectionManager(interaction)
      );
    }
  }
}