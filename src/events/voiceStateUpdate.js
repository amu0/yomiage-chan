const Guild = require("../../models/guild");
const { disconnect } = require("../util");

module.exports = {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const oldStateCh = oldState.channel
    const manager = client.connectionManagers.get(oldState.guild.id || newState.guild.id);

    // 接続中のVCから誰もいなくなった場合は切断する
    if (oldStateCh && oldStateCh.members.has(client.user.id) && oldStateCh.members.size < 2) {
      manager.readingCh.send({
        embeds: [{
          title: "INFO",
          description: "誰もいなくなったので読み上げを終了します",
          color: "43a1ec",
          timestamp: new Date()
        }]
      });

      await disconnect(client.connectionManagers, oldState.guild.id);
      return;
    }

    // BOTが切断された時にconnectionManagerを削除する
    if (newState.member.user.id === client.user.id
      && !newState.channel && client.connectionManagers.has(newState.guild.id)) {
      client.connectionManagers.delete(newState.guild.id);
    }

    // 入退出を読み上げ
    if (oldStateCh !== newState.channel) {
      const joinLeftCheck = await Guild.findByPk(oldState.guild.id, {
        attributes: ["joinLeftCheck"]
      }).then((model) => {
        if (model !== null && model.getDataValue("joinLeftCheck") !== null) {
          return model.getDataValue("joinLeftCheck");
        } else {
          return true;
        }
      }).catch(console.error);
      if (!joinLeftCheck) return;

      // ユーザーが参加
      if (newState.channel && newState.channel.members.has(client.user.id)) {
        const msg = `${newState.member.displayName}が参加`;

        manager.readMsg({
          userName: "",
          message: msg,
          speakerId: 0,
          guildId: newState.guild.id
        });

        manager.readingCh.send({
          embeds: [{
            author: {
              name: msg,
              icon_url: newState.member.displayAvatarURL()
            },
            color: "00ff00",
            timestamp: new Date()
          }]
        });
      }

      // ユーザーが退出
      if (oldStateCh && oldStateCh.members.has(client.user.id)
        && oldState.member.user.id !== client.user.id) {
        const msg = `${newState.member.displayName}が退出`;
        manager.readMsg({
          userName: "",
          message: msg,
          speakerId: 0,
          guildId: oldState.guild.id
        });
        manager.readingCh.send({
          embeds: [{
            author: {
              name: msg,
              icon_url: newState.member.displayAvatarURL()
            },
            color: "ff0000",
            timestamp: new Date()
          }]
        });
      }
    }
  }
}