const Joi = require('joi');
const BaseValidator = require('./abstract/base.validator');

class UserValidator extends BaseValidator {

  constructor() {
    super();

    this.getUser = this.getUser.bind(this);
    this.getUsers = this.getUsers.bind(this);
  }

  getUser() {
    const querySchema = {
      id: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, (req, query) => query.id);
  }

  getUsers() {
    const querySchema = {
      email: Joi.string().email().required(),
      mobile: Joi.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).required()
    };

    return this.validate(querySchema, null, (req, query) => query);
  }

}

module.exports = UserValidator;
