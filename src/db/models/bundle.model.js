const Sequelize = require('sequelize');
const {Model} = Sequelize;

/**
 * @typedef {Class} BundleModel
 * @property {Number} id
 * @property {Number} quantity
 * @property {Number} price
 * @property {Number} raffle_id
 */
class BundleModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  Bundle:
   *    type: object
   *    required:
   *    - quantity
   *    - price
   *    - raffle_id
   *    properties:
   *      id:
   *        type: integer
   *        example: 1
   *      quantity:
   *        type: integer
   *        example: 3
   *      price:
   *        type: number
   *        format: double
   *        example: 33.00
   *      raffle_id:
   *        type: integer
   *        example: 1
   *  Bundles:
   *    type: array
   *    items:
   *      $ref: '#/definitions/Bundle'
   *
   * @BundlePublicObject
   */
  getPublic() {
    return {
      id: this.id,
      quantity: this.quantity,
      price: this.price,
      raffle_id: this.raffle_id
    };
  }
}
const attributes = {
  quantity: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  price: {
    type: Sequelize.DOUBLE,
    allowNull: false
  },
  raffle_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  }
};

module.exports = {
  init: (sequelize) => {
    BundleModel.init(attributes, {
      sequelize,
      modelName: 'bundles'
    });
  },
  associate(models) {
    BundleModel.belongsTo(models.Raffle.model, {foreignKey : 'raffle_id', targetKey: 'id'});
  },
  get model() {
    return BundleModel;
  }
};
