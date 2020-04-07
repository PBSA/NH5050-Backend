const Joi = require('joi');
const tldJS = require('tldjs');
const BaseValidator = require('./abstract/base.validator');
const ValidateError = require('../errors/validate.error');
const profileConstants = require('../constants/profile');
const userRepository = require('../repositories/user.repository');

class AuthValidator extends BaseValidator {
  constructor() {
    super();

    this.userRepository = new userRepository();
    this.validatePlayerSignUp = this.validatePlayerSignUp.bind(this);
    this.validateSignIn = this.validateSignIn.bind(this);
    this.loggedOnly = this.loggedOnly.bind(this);
    this.loggedAdminOnly = this.loggedAdminOnly.bind(this);
  }

  loggedOnly() {
    return this.validate(null, null, async (req) => {

      if (!req.isAuthenticated()) {
        throw new ValidateError(401, 'unauthorized');
      }

      return null;
    });
  }

  loggedAdminOnly() {
    return this.validate(null, null, async (req) => {

      if (!req.isAuthenticated()) {
        throw new ValidateError(401, 'unauthorized');
      }

      if (req.user.user_type !== profileConstants.userType.admin) {
        throw new ValidateError(403, 'forbidden');
      }

      return null;
    });
  }

  validatePlayerSignUp() {
    const bodySchema = {
      id: Joi.number().integer(),
      email: Joi.string().email().required(),
      mobile: Joi.string().regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).required(),
      firstname: Joi.string().required(),
      lastname: Joi.string().required(),
      password: Joi.string().regex(/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])[a-zA-Z0-9!@#\$%\^&\*]+$/).min(6).max(60),
      is_email_allowed: Joi.boolean().required(),
      organization_id: Joi.number().integer()
    };

    return this.validate(null, bodySchema, async (req, query, body) => {
      const {email, mobile} = body;

      if (email.match(/@.+\..+/) && (!tldJS.tldExists(email) || (email.split('@').pop().split('.').length > 2))) {
        throw new ValidateError(400, 'Validate error', {
          email: 'Invalid email'
        });
      }

      const alreadyExists = await this.userRepository.getByEmailOrMobile(email.toLowerCase(), mobile);

      if (alreadyExists && alreadyExists.email === email.toLowerCase()) {
        if(!body.hasOwnProperty('id') || alreadyExists.id !== body.id) {
          throw new ValidateError(400, 'Validate error', {
            email: 'This email is already used'
          });
        }
      }

      if (alreadyExists && alreadyExists.mobile === this.userRepository.normalizePhoneNumber(mobile)) {
        if(!body.hasOwnProperty('id') || alreadyExists.id !== body.id) {
          throw new ValidateError(400, 'Validate error', {
            mobile: 'This mobile number is already used'
          });
        }
      }

      return body;
    });
  }

  validateSignIn() {
    const bodySchema = {
      email: Joi.string().required(),
      password: Joi.string().required()
    };

    return this.validate(null, bodySchema, async (req, query, body) => {
      const {email} = body;

      const user = await this.userRepository.findByEmail(email.toLowerCase());

      if (user && user.status === profileConstants.status.inactive) {
        throw new ValidateError(403, 'Your account has been inactivated. Please contact your admin.');
      }

      return body;
    });
  }

}

module.exports = AuthValidator;
