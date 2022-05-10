module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    if (!interaction.guild) return;

    const interactionHandler = client.interactions.get(interaction.commandName);
    if (!interactionHandler) return;
    try {
      await interactionHandler.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  }
}