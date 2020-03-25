const Sequelize = require('sequelize');
const {Model} = Sequelize;
const profileConstants = require('../../constants/profile');

/**
 * @typedef {Object} UserPublicObject
 * @property {Number} id
 * @property {String} username
 * @property {String} email
 * @property {String} firstname
 * @property {String} lastname
 * @property {String} mobile
 * @property {Boolean} is_email_allowed
 * @property {String} status
 * @property {Number} organization_id
 */

/**
 * @typedef {Class} UserModel
 * @property {Number} id
 * @property {String} username
 * @property {String} email
 * @property {String} firstname
 * @property {String} lastname
 * @property {String} mobile
 * @property {Boolean} is_email_verified
 * @property {Boolean} is_email_allowed
 * @property {String} status
 * @property {String} peerplays_account_name
 * @property {String} peerplays_master_password
 * @property {String} peerplays_account_id
 * @property {Number} organization_id
 * @property {Enum} user_type
 * @property {String} ip_address
 */
class UserModel extends Model {
  /**
   * @swagger
   *
   * definitions:
   *  User:
   *    type: object
   *    required:
   *    - firstname
   *    - email
   *    - mobile
   *    - is_email_allowed
   *    - user_type
   *    - organization_id
   *    properties:
   *      password:
   *        type: string
   *        example: p@ssw0rd9999
   *        minLength: 6
   *        maxLength: 30
   *        format: password
   *        pattern: '^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$'
   *      firstname:
   *        type: string
   *        example: Prabhjot
   *      lastname:
   *        type: string
   *        example: Singh
   *      email:
   *        type: string
   *        format: email
   *        example: p.singh@gmail.com
   *      mobile:
   *        type: string
   *        example: +1 (999) 999-9999
   *      is_email_allowed:
   *        type: boolean
   *      user_type:
   *        type: string
   *        enum:
   *        - player
   *        - seller
   *        - admin
   *      organization_id:
   *        type: integer
   *        example: 1
   *
   *  UserPublic:
   *    type: object
   *    properties:
   *      id:
   *        type: integer
   *      firstname:
   *        type: string
   *        example: Prabhjot
   *      lastname:
   *        type: string
   *        example: Singh
   *      email:
   *        type: string
   *        format: email
   *        example: p.singh@gmail.com
   *      mobile:
   *        type: string
   *        example: +1 (999) 999-9999
   *      is_email_allowed:
   *        type: boolean
   *      organization_id:
   *        type: integer
   *        example: 1
   *      status:
   *        type: string
   *        enum:
   *        - active
   *        - inactive
   *
   * @returns {UserPublicObject}
   */
  getPublic() {
    return {
      id: this.id,
      email: this.email,
      firstname: this.firstname || '',
      lastname: this.lastname || '',
      mobile: this.mobile,
      is_email_allowed: this.is_email_allowed,
      organization_id: this.organization_id,
      status: this.status
    };
  }
}
const attributes = {
  email: {
    type: Sequelize.STRING,
    unique: true
  },
  mobile: {
    type: Sequelize.STRING,
    unique: true
  },
  firstname: {
    type: Sequelize.STRING
  },
  lastname: {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: ''
  },
  is_email_verified: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  is_email_allowed: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  },
  password: {
    type: Sequelize.STRING,
    allowNull: true
  },
  peerplays_account_name: {
    type: Sequelize.STRING,
    defaultValue: ''
  },
  peerplays_account_id: {
    type: Sequelize.STRING,
    defaultValue: ''
  },
  peerplays_master_password: {
    type: Sequelize.STRING,
    defaultValue: ''
  },
  user_type: {
    type: Sequelize.ENUM(Object.keys(profileConstants.userType).map((key) => profileConstants.userType[key])),
    defaultValue: profileConstants.userType.player
  },
  status: {
    type: Sequelize.ENUM(Object.keys(profileConstants.status).map((key) => profileConstants.status[key])),
    defaultValue: profileConstants.status.active
  },
  ip_address: {
    type:Sequelize.STRING,
    allowNull: true
  },
  organization_id: {
    type: Sequelize.INTEGER,
    allowNull: true
  }
};

module.exports = {
  init: (sequelize) => {
    UserModel.init(attributes, {
      sequelize,
      modelName: 'users'
    });
  },
  associate(models) {
    UserModel.belongsTo(models.Organization.model, {foreignKey : 'organization_id', targetKey: 'id'});
  },
  get model() {
    return UserModel;
  }
};
