"use strict";
const {Sequelize, DataTypes} = require("sequelize");
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "settings.sqlite",
  logging: false
});

module.exports = {
  DataTypes,
  sequelize
}