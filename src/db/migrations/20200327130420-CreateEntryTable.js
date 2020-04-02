const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  ...MigrationUtil.createForeignFields(['ticket_sales_id']),

  peerplays_raffle_ticket_id: {
    type: DataTypes.STRING
  },
  peerplays_progressive_ticket_id: {
    type: DataTypes.STRING
  }
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('entries', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('entries');
  },
};