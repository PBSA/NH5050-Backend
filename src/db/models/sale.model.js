const Sequelize = require('sequelize');
const {Model} = Sequelize;
const saleConstants = require('../../constants/sale');

/**
 * @typedef {Class} SaleModel
 * @property {Number} id
 * @property {Number} raffle_id
 * @property {Number} player_id
 * @property {Number} ticketbundle_id
 * @property {Number} total_price
 * @property {Number} beneficiary_id
 * @property {Number} seller_id
 * @property {String} stripe_payment_id
 * @property {Enum} payment_type
 * @property {Enum} payment_status
 */
class SaleModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  TicketSale:
   *    type: object
   *    required:
   *    - raffle_id
   *    - ticketbundle_id
   *    - total_price
   *    - beneficiary_id
   *    - payment_type
   *    properties:
   *      raffle_id:
   *        type: integer
   *        example: 1
   *      ticketbundle_id:
   *        type: integer
   *        example: 2
   *      total_price:
   *        type: number
   *        format: double
   *        multipleOf: 0.01
   *        example: 30.00
   *      beneficiary_id:
   *        type: integer
   *        example: 3
   *      seller_password:
   *        type: string
   *        example: p%ssw0rd9999
   *      payment_type:
   *        type: string
   *        enum:
   *        - cash
   *        - stripe
   *      stripe_payment_id:
   *        type: string
   *        example: 'P5AS2AS145235'
   *  TicketSalePublic:
   *    type: object
   *    properties:
   *      id:
   *        type: integer
   *      raffle_id:
   *        type: integer
   *      player:
   *        $ref: '#/definitions/UserPublic'
   *      bundle:
   *        $ref: '#/definitions/Bundle'
   *      total_price:
   *        type: number
   *        format: double
   *        multipleOf: 0.01
   *        example: 30.00
   *      beneficiary:
   *        $ref: '#/definitions/BeneficiaryPublic'
   *      seller:
   *        $ref: '#/definitions/UserPublic'
   *      payment_type:
   *        type: string
   *        enum:
   *        - cash
   *        - stripe
   *      stripe_payment_id:
   *        type: string
   *  TicketSalesPublic:
   *    type: array
   *    items:
   *      $ref: '#/definitions/TicketSalePublic'
   *
   * @SalePublicObject
   */
  getPublic() {
    return {
      id: this.id,
      raffle_id: this.raffle_id,
      player_id: this.player_id,
      ticketbundle_id: this.ticketbundle_id,
      total_price: this.total_price,
      beneficiary_id: this.beneficiary_id,
      seller_id: this.seller_id,
      stripe_payment_id: this.stripe_payment_id,
      payment_type: this.payment_type
    };
  }
}
const attributes = {
  total_price: {
    type: Sequelize.DOUBLE,
    allowNull: false
  },
  stripe_payment_id: {
    type: Sequelize.STRING,
    unique: true
  },
  payment_type: {
    type: Sequelize.ENUM(Object.keys(saleConstants.paymentType).map((key) => saleConstants.paymentType[key])),
    defaultValue: saleConstants.paymentType.stripe,
    allowNull: false
  },
  payment_status: {
    type: Sequelize.ENUM(Object.keys(saleConstants.paymentStatus).map((key) => saleConstants.paymentStatus[key])),
    defaultValue: saleConstants.paymentStatus.waiting,
    allowNull: false
  }
};

module.exports = {
  init: (sequelize) => {
    SaleModel.init(attributes, {
      sequelize,
      modelName: 'sales'
    });
  },
  associate(models) {
    SaleModel.belongsTo(models.Raffle.model, {foreignKey : 'raffle_id', targetKey: 'id'});
    SaleModel.belongsTo(models.User.model, {foreignKey : 'player_id', targetKey: 'id', as: 'player'});
    SaleModel.belongsTo(models.User.model, {foreignKey : 'seller_id', targetKey: 'id', as: 'seller'});
    SaleModel.belongsTo(models.Bundle.model, {foreignKey : 'ticketbundle_id', targetKey: 'id'});
    SaleModel.belongsTo(models.Beneficiary.model, {foreignKey : 'beneficiary_id', targetKey: 'id'});
  },
  get model() {
    return SaleModel;
  }
};
