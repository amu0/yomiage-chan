const fs = require("fs");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`${client.user.tag}でログインしています。`);

    const interactions = [];
    const interactionFiles = fs.readdirSync("./src/interactions").filter(file => file.endsWith(".js"));

    for (const file of interactionFiles) {
      const interaction = require(`../interactions/${file}`);
      interactions.push(interaction.data.toJSON());
    }
    await client.application.commands.set(interactions);
    console.log("コマンドをセットしました");
  }
}