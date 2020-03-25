const Joi = require('joi');
const BaseValidator = require('./abstract/base.validator');
const ValidateError = require('../errors/validate.error');
const organizationConstants = require('./../constants/organization');
const usStates = require('./data/us.states').default;

class OrganizationValidator extends BaseValidator {

  constructor() {
    super();

    this.getOrganization = this.getOrganization.bind(this);
    this.validateOrganization = this.validateOrganization.bind(this);
  }

  getOrganization() {
    const querySchema = {
      id: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, (req, query) => query.organizationId);
  }

  validateOrganization() {
    const bodySchema = {
      id: Joi.number().integer(),
      non_profit_id: Joi.string(),
      name: Joi.string().required(),
      type: Joi.string().valid(Object.values(organizationConstants.organizationType)),
      address_line1: Joi.string().required(),
      address_line2: Joi.string(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().valid(Object.values(organizationConstants.country)).required(),
      zip: Joi.string().required(),
      time_format: Joi.string().valid(Object.values(organizationConstants.timeFormat)).required(),
      logo_url: Joi.string().required(),
      website_url: Joi.string().required()
    };

    return this.validate(null, bodySchema, async (req, query, body) => {
      if (body.country === organizationConstants.country.us) {
        if (!usStates[body.state]) {
          throw new ValidateError(400, 'Validate error', {
            state: 'Invalid state'
          });
        }
      }

      return body;
    });
  }

}

module.exports = OrganizationValidator;
