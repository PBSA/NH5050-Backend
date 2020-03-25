const Sequelize = require('sequelize');
const {Model} = Sequelize;
const raffleConstants = require('../../constants/raffle');

/**
 * @typedef {Object} RafflePublicObject
 * @property {Number} id
 * @property {String} raffle_name
 * @property {String} raffle_description
 * @property {String} slug
 * @property {Number} organization_id
 * @property {Date} start_datetime
 * @property {Date} end_datetime
 * @property {Date} draw_datetime
 * @property {Enum} draw_type
 * @property {Number} progressive_draw_id
 * @property {Number} admin_fees_percent
 * @property {Number} donation_percent
 * @property {Number} raffle_draw_percent
 * @property {Number} progressive_draw_percent
 * @property {Number} organization_percent
 * @property {Number} beneficiary_percent
 * @property {String} image_url
 */

/**
 * @typedef {Class} RaffleModel
 * @property {Number} id
 * @property {String} raffle_name
 * @property {String} raffle_description
 * @property {String} slug
 * @property {Number} organization_id
 * @property {Date} start_datetime
 * @property {Date} end_datetime
 * @property {Date} draw_datetime
 * @property {Enum} draw_type
 * @property {Number} progressive_draw_id
 * @property {Number} admin_fees_percent
 * @property {Number} donation_percent
 * @property {Number} raffle_draw_percent
 * @property {Number} progressive_draw_percent
 * @property {Number} organization_percent
 * @property {Number} beneficiary_percent
 * @property {String} image_url
 * @property {String} peerplays_draw_id
 * @property {Number} winner_id
 */
class RaffleModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  Raffle:
   *    type: object
   *    required:
   *    - raffle_name
   *    - raffle_description
   *    - slug
   *    - organization_id
   *    - start_datetime
   *    - end_datetime
   *    - draw_datetime
   *    - draw_type
   *    - admin_fees_percent
   *    - donation_percent
   *    - raffle_draw_percent
   *    - progressive_draw_percent
   *    - organization_percent
   *    - beneficiary_percent
   *    - image_url
   *    properties:
   *      raffle_name:
   *        type: string
   *        example: Progressive 50/50
   *      raffle_description:
   *        type: string
   *        example: Lorem Ipsum is simply dummy text of the printing and typesetting industry.
   *      slug:
   *        type: string
   *        example: Progressive5050
   *      organization_id:
   *        type: integer
   *        example: 1
   *      start_datetime:
   *        type: string
   *        format: date-time
   *      end_datetime:
   *        type: string
   *        format: date-time
   *      draw_datetime:
   *        type: string
   *        format: date-time
   *      draw_type:
   *        type: string
   *        enum:
   *        - progressive
   *        - 5050
   *      progressive_draw_id:
   *        type: integer
   *        example: 1
   *      admin_fees_percent:
   *        type: number
   *        format: double
   *        example: 13.00
   *      donation_percent:
   *        type: number
   *        format: double
   *        example: 5.00
   *      raffle_draw_percent:
   *        type: number
   *        format: double
   *        example: 20.50
   *      progressive_draw_percent:
   *        type: number
   *        format: double
   *        example: 20.50
   *      organization_percent:
   *        type: number
   *        format: double
   *        example: 36.90
   *      beneficiary_percent:
   *        type: number
   *        format: double
   *        example: 4.10
   *      image_url:
   *        type: string
   *        format: url
   *  RafflePublic:
   *    allOf:
   *    - $ref: '#/definitions/Raffle'
   *    - type: object
   *    - properties:
   *        id:
   *          type: integer
   *          example: 1
   *        winner:
   *          $ref: '#/definitions/UserPublic'
   *  RafflesPublic:
   *    type: array
   *    items:
   *      $ref: '#/definitions/RafflePublic'
   *
   * @returns {RafflePublicObject}
   */
  getPublic() {
    return {
      id: this.id,
      raffle_name: this.raffle_name,
      raffle_description: this.raffle_description,
      slug: this.slug,
      organization_id: this.organization_id,
      start_datetime: this.start_datetime,
      end_datetime: this.end_datetime,
      draw_datetime: this.draw_datetime,
      draw_type: this.draw_type,
      progressive_draw_id: this.progressive_draw_id,
      admin_fees_percent: this.admin_fees_percent,
      donation_percent: this.donation_percent,
      raffle_draw_percent: this.raffle_draw_percent,
      progressive_draw_percent: this.progressive_draw_percent,
      organization_percent: this.organization_percent,
      beneficiary_percent: this.beneficiary_percent,
      image_url: this.image_url
    };
  }
}
const attributes = {
  raffle_name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  raffle_description: {
    type: Sequelize.STRING,
    allowNull: false
  },
  slug: {
    type: Sequelize.STRING,
    allowNull: false
  },
  organization_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  start_datetime: {
    type: Sequelize.DATE,
    allowNull: false
  },
  end_datetime: {
    type: Sequelize.DATE,
    allowNull: false
  },
  draw_datetime: {
    type: Sequelize.DATE,
    allowNull: false
  },
  draw_type: {
    type: Sequelize.ENUM(Object.keys(raffleConstants.drawType).map((key) => raffleConstants.drawType[key])),
    defaultValue: raffleConstants.drawType.normal
  },
  progressive_draw_id: {
    type: Sequelize.INTEGER
  },
  admin_fees_percent: {
    type: Sequelize.DOUBLE
  },
  donation_percent: {
    type:Sequelize.DOUBLE
  },
  raffle_draw_percent: {
    type:Sequelize.DOUBLE
  },
  progressive_draw_percent: {
    type:Sequelize.DOUBLE
  },
  organization_percent: {
    type:Sequelize.DOUBLE
  },
  beneficiary_percent: {
    type:Sequelize.DOUBLE
  },
  image_url: {
    type:Sequelize.STRING
  },
  peerplays_draw_id: {
    type: Sequelize.STRING,
    allowNull: false
  },
  winner_id: {
    type: Sequelize.INTEGER
  }
};

module.exports = {
  init: (sequelize) => {
    RaffleModel.init(attributes, {
      sequelize,
      modelName: 'raffles'
    });
  },
  associate(models) {
    RaffleModel.belongsTo(models.User.model, {foreignKey : 'winner_id', targetKey: 'id'});
    RaffleModel.belongsTo(models.Organization.model, {foreignKey : 'organization_id', targetKey: 'id'});
  },
  get model() {
    return RaffleModel;
  }
};
