const MigrationUtil = require('../../utils/migtation.util');
const DataTypes = require('sequelize/lib/data-types');

const fields = {
  ...MigrationUtil.genericRows(),
  raffle_name: { type: DataTypes.STRING, allowNull: false },
  raffle_description: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false },
  organization_id: { type: DataTypes.INTEGER, allowNull: false },
  start_datetime: { type: DataTypes.DATE, allowNull: false },
  end_datetime: { type: DataTypes.DATE, allowNull: false },
  draw_datetime: { type: DataTypes.DATE, allowNull: false },
  draw_type: { type: DataTypes.ENUM(['progressive','5050']), defaultValue: '5050' },
  progressive_draw_id: { type: DataTypes.INTEGER },
  admin_fees_percent: { type: DataTypes.DOUBLE },
  donation_percent: { type: DataTypes.DOUBLE },
  raffle_draw_percent: { type: DataTypes.DOUBLE },
  progressive_draw_percent: { type: DataTypes.DOUBLE },
  organization_percent: { type: DataTypes.DOUBLE },
  beneficiary_percent: { type: DataTypes.DOUBLE },
  image_url: { type: DataTypes.STRING },
  peerplays_draw_id: { type: DataTypes.STRING, allowNull: false },
  winner_id: { type: DataTypes.INTEGER }
};

module.exports = {
  up: (queryInterface) => {
    return queryInterface.createTable('raffles', fields);
  },

  down: (queryInterface) => {
    return queryInterface.dropTable('raffles');
  },
};
