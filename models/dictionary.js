"use strict";
const { sequelize, DataTypes } = require("../src/db");

const Dictionary = sequelize.define(
  "dictionary",
  {
    guildId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    word: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    reading: {
      type: DataTypes.STRING,
      allowNull: false
    }
  },
  {
    freezeTableName: true,
    timestamps: false
  }
);

module.exports = Dictionary;