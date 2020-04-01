const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  raffle_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('bundles', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('bundles');
  },
};