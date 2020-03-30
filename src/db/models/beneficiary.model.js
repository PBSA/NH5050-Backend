const Sequelize = require('sequelize');
const {Model} = Sequelize;

/**
 * @typedef {Class} BeneficiaryModel
 * @property {Number} id
 * @property {Number} user_id
 * @property {Number} organization_id
 */
class BeneficiaryModel extends Model {
}

const attributes = {
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  organization_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  }
};

module.exports = {
  init: (sequelize) => {
    BeneficiaryModel.init(attributes, {
      sequelize,
      modelName: 'beneficiaries'
    });
  },
  associate(models) {
    BeneficiaryModel.belongsTo(models.Organization.model, {foreignKey : 'user_id', targetKey: 'id', as: 'user'});
    BeneficiaryModel.belongsTo(models.Organization.model, {foreignKey : 'organization_id', targetKey: 'id', as: 'organization'});
  },
  get model() {
    return BeneficiaryModel;
  }
};
