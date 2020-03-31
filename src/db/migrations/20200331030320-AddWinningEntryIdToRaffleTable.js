const DataTypes = require('sequelize/lib/data-types');

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'raffles',
      'winning_entry_id',
      {
        type: DataTypes.INTEGER,
        references: {
          model: 'entries',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'raffles',
      'winning_entry_id'
    );
  }
};