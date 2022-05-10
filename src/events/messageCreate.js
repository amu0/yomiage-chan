module.exports = {
  name: "messageCreate",
  execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const manager = client.connectionManagers.get(message.guildId);
    if (manager) manager.messageProcessor(message);
  }
}