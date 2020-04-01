const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'organizations',
      key: 'id',
    }
  },
  organization_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'organizations',
      key: 'id',
    }
  },
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('beneficiaries', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('beneficiaries');
  },
};
