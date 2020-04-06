const DataTypes = require('sequelize/lib/data-types');

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      'raffles',
      'raffle_description',
      {
        type: DataTypes.STRING(1500),
        allowNull: false,
      }
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.changeColumn(
      'raffles',
      'raffle_description', 
      {
        type: DataTypes.STRING,
        allowNull: false,
      }
    );
  }
};