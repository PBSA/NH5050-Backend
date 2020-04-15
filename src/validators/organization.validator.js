const Joi = require('joi');
const BaseValidator = require('./abstract/base.validator');
const ValidateError = require('../errors/validate.error');
const organizationConstants = require('./../constants/organization');
const OrganizationRepository = require('../repositories/organization.repository');
const usStates = require('./data/us.states').default;

export default class OrganizationValidator extends BaseValidator {

  constructor() {
    super();
    this.organizationRepository = new OrganizationRepository();

    this.validateOrganizationId = this.validateOrganizationId.bind(this);
    this.validateGetSellers = this.validateGetSellers.bind(this);
    this.validateOrganization = this.validateOrganization.bind(this);
  }

  validateOrganizationId() {
    const querySchema = {
      organizationId: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, (req, query) => query.organizationId);
  }

  validateGetSellers() {
    const querySchema = {
      organizationId: Joi.number().integer().required(),
      raffleId: Joi.number().integer()
    };

    return this.validate(querySchema, null, (req, query) => ({
      organizationId: query.organizationId,
      raffleId: query.raffleId
    }));
  }

  validateOrganization() {
    const bodySchema = {
      id: Joi.number().integer(),
      non_profit_id: Joi.string(),
      name: Joi.string().required(),
      type: Joi.string().valid(Object.values(organizationConstants.organizationType)),
      address_line1: Joi.string(),
      address_line2: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string().valid(Object.values(organizationConstants.country)),
      zip: Joi.string().regex(/(^\d{5}$)|(^\d{5}-\d{4}$)/),
      time_format: Joi.string().valid(Object.values(organizationConstants.timeFormat)).required(),
      logo_url: Joi.string().uri(),
      website_url: Joi.string().required().uri()
    };

    return this.validate(null, bodySchema, async (req, query, body) => {
      if (body.country === organizationConstants.country.us) {
        if(body.state) {
          if (!usStates[body.state]) {
            throw new ValidateError(400, 'Validate error', {
              state: 'Invalid state'
            });
          }
        }
      }

      if(body.id) {
        const org = await this.organizationRepository.findByPk(body.id);

        if(!org) {
          throw new ValidateError(400, 'Validate error', {
            id: 'Organization not found'
          });
        }
      }

      return body;
    });
  }

}
