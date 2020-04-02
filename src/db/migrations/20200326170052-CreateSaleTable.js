const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  ...MigrationUtil.createForeignFields(['raffle_id','player_id','seller_id','ticketbundle_id','beneficiary_id']),

  total_price: {
    type: DataTypes.DOUBLE,
    allowNull: false
  },
  stripe_payment_id: {
    type: DataTypes.STRING,
    unique: true
  },
  payment_type: {
    type: DataTypes.ENUM(['cash','stripe']),
    defaultValue: 'stripe',
    allowNull: false
  },
  payment_status: {
    type: DataTypes.ENUM(['success','cancel','waiting']),
    defaultValue: 'waiting',
    allowNull: false
  }
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('sales', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('sales');
  },
};