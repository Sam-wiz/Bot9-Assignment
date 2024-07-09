const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  messages: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  }
});

module.exports = Conversation;