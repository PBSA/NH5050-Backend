const Sequelize = require('sequelize');
const {Model} = Sequelize;
const organizationConstants = require('../../constants/organization');

/**
 * @typedef {Object} OrganizationPublicObject
 * @property {Number} id
 * @property {String} non_profit_id
 * @property {String} name
 * @property {String} type
 * @property {String} address_line1
 * @property {String} address_line2
 * @property {String} city
 * @property {String} state
 * @property {String} country
 * @property {String} zip
 * @property {String} time_format
 * @property {String} logo_url
 * @property {String} website_url
 */

/**
 * @typedef {Class} OrganizationModel
 * @property {Number} id
 * @property {String} non_profit_id
 * @property {String} name
 * @property {String} type
 * @property {String} address_line1
 * @property {String} address_line2
 * @property {String} city
 * @property {String} state
 * @property {String} country
 * @property {String} zip
 * @property {String} stripe_account_id
 * @property {String} time_format
 * @property {String} logo_url
 * @property {String} website_url
 */
class OrganizationModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  Organization:
   *    type: object
   *    required:
   *      - non_profit_id
   *      - name
   *      - type
   *      - address_line1
   *      - address_line2
   *      - city
   *      - state
   *      - country
   *      - zip
   *      - stripe_account_id
   *      - time_format
   *      - logo_url
   *      - website_url
   *    properties:
   *      non_profit_id:
   *        type: string
   *      name:
   *        type: string
   *      type:
   *        type: string
   *        enum:
   *          - organization
   *          - beneficiary
   *      address_line1:
   *        type: string
   *      address_line2:
   *        type: string
   *      city:
   *        type: string
   *      state:
   *        type: string
   *      country:
   *        type: string
   *      stripe_account_id:
   *        type: string
   *      time_format:
   *        type: string
   *        enum:
   *          - 12h
   *          - 24h
   *      logo_url:
   *        type: string
   *      website_url:
   *        type: string
   *
   *  OrganizationPublicObject:
   *    type: object
   *    properties:
   *      id:
   *        type: integer
   *      non_profit_id:
   *        type: string
   *      name:
   *        type: string
   *      type:
   *        type: string
   *        enum:
   *          - organization
   *          - beneficiary
   *      address_line1:
   *        type: string
   *      address_line2:
   *        type: string
   *      city:
   *        type: string
   *      state:
   *        type: string
   *      country:
   *        type: string
   *        enum:
   *          - us
   *      time_format:
   *        type: string
   *        enum:
   *          - 12h
   *          - 24h
   *      logo_url:
   *        type: string
   *      website_url:
   *        type: string
   *
   * @returns {UserPublicObject}
   */
  getPublic() {
    return {
      id: this.id,
      non_profit_id: this.non_profit_id,
      name: this.name,
      type: this.type,
      address_line1: this.address_line1,
      address_line2: this.address_line2,
      city: this.city,
      state: this.state,
      country: this.country,
      zip: this.zip,
      time_format: this.time_format,
      logo_url: this.logo_url,
      website_url: this.website_url
    };
  }
}
const attributes = {
  non_profit_id: {
    type: Sequelize.STRING,
    allowNull: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false
  },
  type: {
    type: Sequelize.ENUM(Object.values(organizationConstants.organizationType)),
    defaultValue: organizationConstants.organizationType.organization
  },
  address_line1: {
    type: Sequelize.STRING,
    allowNull: false
  },
  address_line2: {
    type: Sequelize.STRING,
    allowNull: true
  },
  city: {
    type: Sequelize.STRING,
    allowNull: false
  },
  state: {
    type: Sequelize.STRING,
    allowNull: false
  },
  country: {
    type: Sequelize.ENUM(Object.values(organizationConstants.country)),
    defaultValue: organizationConstants.country.us
  },
  zip: {
    type: Sequelize.STRING,
    allowNull: false
  },
  time_format: {
    type: Sequelize.ENUM(Object.values(organizationConstants.timeFormat)),
    defaultValue: organizationConstants.timeFormat.time12h
  },
  logo_url: {
    type: Sequelize.STRING,
    allowNull: false
  },
  website_url: {
    type: Sequelize.STRING,
    allowNull: false
  }
};

module.exports = {
  init: (sequelize) => {
    OrganizationModel.init(attributes, {
      sequelize,
      modelName: 'organizations'
    });
  },
  get model() {
    return OrganizationModel;
  }
};
