"use strict";
const { sequelize, DataTypes } = require("../src/db");

const Speaker = sequelize.define(
  "speaker",
  {
    userId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    speakerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false
  }
);

module.exports = Speaker;