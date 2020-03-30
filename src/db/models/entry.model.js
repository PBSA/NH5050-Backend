const Sequelize = require('sequelize');
const {Model} = Sequelize;

/**
 * @typedef {Class} EntryModel
 * @property {Number} id
 * @property {Number} ticket_sales_id
 * @property {String} peerplays_raffle_ticket_id
 * @property {String} peerplays_progressive_ticket_id
 */
class EntryModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  EntriesPublic:
   *    type: object
   *    properties:
   *      entries:
   *        type: array
   *        example: [ {"id": 5}, {"id": 8} ]
   *        items:
   *          type: object
   *          properties:
   *            id:
   *              type: integer
   *      ticket_sales:
   *        $ref: '#/definitions/TicketSalePublic'
   *
   * @EntryPublicObject
   */
  getPublic() {
    return {
      id: this.id,
      ticket_sales_id: this.ticket_sales_id
    };
  }
}
const attributes = {
  ticket_sales_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  peerplays_raffle_ticket_id: {
    type: Sequelize.STRING
  },
  peerplays_progressive_ticket_id: {
    type: Sequelize.STRING
  }
};

module.exports = {
  init: (sequelize) => {
    EntryModel.init(attributes, {
      sequelize,
      modelName: 'entries'
    });
  },
  associate(models) {
    EntryModel.belongsTo(models.Sale.model, {foreignKey : 'ticket_sales_id', targetKey: 'id'});
  },
  get model() {
    return EntryModel;
  }
};
