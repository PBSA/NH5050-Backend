const Joi = require('joi');
const BaseValidator = require('./abstract/base.validator');

class OrganizationValidator extends BaseValidator {

  constructor() {
    super();

    this.getOrganization = this.getOrganization.bind(this);
  }

  getOrganization() {
    const querySchema = {
      id: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, (req, query) => query.organizationId);
  }

}

module.exports = OrganizationValidator;
