const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  name: {type: DataTypes.STRING, allowNull: false},
  non_profit_id: {type: DataTypes.STRING, allowNull: true},
  type: {type: DataTypes.ENUM(['organization', 'beneficiary']), defaultValue: 'organization'},
  address_line1: {type: DataTypes.STRING},
  address_line2: {type: DataTypes.STRING},
  city: {type: DataTypes.STRING},
  state: {type: DataTypes.STRING},
  country: {type: DataTypes.ENUM(['us']), defaultValue: 'us'},
  zip: {type: DataTypes.STRING},
  stripe_account_id: {type: DataTypes.STRING, allowNull: true},
  time_format: {type: DataTypes.ENUM(['12h', '24h']), defaultValue: '12h'},
  logo_url: {type: DataTypes.STRING},
  website_url: {type: DataTypes.STRING}
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('organizations', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('organizations');
  },
};