const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  ...MigrationUtil.createForeignFields(['raffle_id']),

  transfer_from: {
    type: DataTypes.STRING
  },
  transfer_to: {
    type:DataTypes.STRING
  },
  peerplays_block_num: {
    type: DataTypes.STRING
  },
  peerplays_transaction_ref: {
    type: DataTypes.STRING
  },
  amount: {
    type: DataTypes.DOUBLE
  },
  transaction_type: {
    type: DataTypes.ENUM(['cashBuy','stripeBuy','ticketPurchase','winnings','donations']),
    allowNull: false
  }
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('transactions', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('transactions');
  },
};