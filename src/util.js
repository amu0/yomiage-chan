"use strict";
function createEmbedMessage(type, message) {
  switch (type) {
    case "info":
      return {
        embeds: [{
          title: "INFO",
          description: message,
          color: "43a1ec",
          timestamp: new Date()
        }]
      };

    case "error":
      return {
        ephemeral: true,
        embeds: [{
          title: "エラー",
          description: message,
          color: "ed4245",
          timestamp: new Date()
        }]
      };
  }
}

async function disconnect(connectionManagers, guildId) {
  const manager = connectionManagers.get(guildId);
  await manager.connection.destroy();
  connectionManagers.delete(guildId);
}

module.exports = {
  createEmbedMessage,
  disconnect
};