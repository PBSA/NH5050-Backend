'use strict';

const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  email: {type: DataTypes.STRING, unique: true},
  mobile: {type: DataTypes.STRING, unique: true},
  firstname: {type: DataTypes.STRING},
  lastname: {type: DataTypes.STRING, allowNull: true, defaultValue: ''},
  is_email_verified: {type: DataTypes.BOOLEAN, defaultValue: false},
  is_email_allowed: {type: DataTypes.BOOLEAN, defaultValue: true},
  password: {type: DataTypes.STRING, allowNull: true},
  peerplays_account_name: {type: DataTypes.STRING, defaultValue: ''},
  peerplays_account_id: {type: DataTypes.STRING, defaultValue: ''},
  peerplays_master_password: {type: DataTypes.STRING, defaultValue: ''},
  user_type: {type: DataTypes.ENUM(['player','seller','admin']), defaultValue: 'player'},
  status: {type: DataTypes.ENUM(['inactive','active']), defaultValue: 'active'},
  ip_address: {type:DataTypes.STRING, allowNull: true}
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('users', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('users');
  },
};