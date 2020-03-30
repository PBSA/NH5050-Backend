const Sequelize = require('sequelize');
const {Model} = Sequelize;

const transactionConstants = require('../../constants/transaction');

/**
 * @typedef {Class} TransactionModel
 * @property {Number} id
 * @property {Number} transfer_from_id
 * @property {Number} transfer_to_id
 * @property {Number} raffle_id
 * @property {String} peerplays_block_num
 * @property {String} peerplays_transaction_ref
 * @property {Number} amount
 * @property {Enum} transaction_type
 */
class TransactionModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  Transaction:
   *    type: object
   *    properties:
   *      id:
   *        type: integer
   *        example: 1
   *      transfer_from:
   *        type: integer
   *        example: 20
   *      transfer_to:
   *        type: integer
   *        example: 141
   *      raffle_id:
   *        type: integer
   *        example: 2
   *      amount:
   *        type: number
   *        format: double
   *        multipleOf: 0.01
   *        example: 30.00
   *      transaction_type:
   *        type: string
   *        enum:
   *        - cashBuy
   *        - stripeBuy
   *        - ticketPurchase
   *        - winnings
   *        - donations
   *  Transactions:
   *    type: array
   *    items:
   *      $ref: '#/definitions/Transaction'
   *
   * @TransactionPublicObject
   */
  getPublic() {
    return {
      id: this.id,
      transfer_from: this.transfer_from,
      transfer_to: this.transfer_to,
      raffle_id: this.raffle_id,
      peerplays_block_num: this.peerplays_block_num,
      peerplays_transaction_ref: this.peerplays_transaction_ref,
      amount: this.amount,
      transaction_type: this.transaction_type
    };
  }
}
const attributes = {
  transfer_from: {
    type: Sequelize.STRING
  },
  transfer_to: {
    type:Sequelize.STRING
  },
  peerplays_block_num: {
    type: Sequelize.STRING
  },
  peerplays_transaction_ref: {
    type: Sequelize.STRING
  },
  amount: {
    type: Sequelize.DOUBLE
  },
  transaction_type: {
    type: Sequelize.ENUM(Object.keys(transactionConstants.transactionType).map((key) => transactionConstants.transactionType[key])),
    allowNull: false
  }
};

module.exports = {
  init: (sequelize) => {
    TransactionModel.init(attributes, {
      sequelize,
      modelName: 'transactions'
    });
  },
  associate(models) {
    TransactionModel.belongsTo(models.Raffle.model, {foreignKey : 'raffle_id', targetKey: 'id'});
  },
  get model() {
    return TransactionModel;
  }
};
