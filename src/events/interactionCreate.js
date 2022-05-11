const { createEmbedMessage } = require("../util");
module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    if (!interaction.guild) return interaction.reply(createEmbedMessage("error", "DMからは利用できません"));
    
    const interactionHandler = client.interactions.get(interaction.commandName);
    if (!interactionHandler) return;
    try {
      await interactionHandler.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  }
}