"use strict";
const { sequelize, DataTypes } = require("../src/db");

const Guild = sequelize.define(
  "guild",
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    readName: {
      type: DataTypes.BOOLEAN
    },
    joinLeftCheck: {
      type: DataTypes.BOOLEAN
    }
  },
  {
    freezeTableName: true,
    timestamps: false
  }
);

module.exports = Guild;