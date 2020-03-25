import RestError from '../errors/rest.error';
import OrganizationService from '../services/organization.service';
import AuthValidator from '../validators/auth.validator';
import OrganizationValidator from '../validators/organization.validator';

class OrganizationsController {

  constructor() {
    this.organizationService = new OrganizationService();
    this.authValidator = new AuthValidator();
    this.organizationValidator = new OrganizationValidator();
  }

  /**
   * Array of routes processed by this controller
   * @returns {*[]}
   */
  getRoutes() {
    return [
      /**
       * @swagger
       *
       * /organization:
       *  get:
       *    tags:
       *    - developers
       *    - organization
       *    summary: get organization details
       *    operationId: getOrganizationById
       *    description: By passing in the id, you can get details for a particular organization
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: organizationId
       *      description: pass the id of the organization
       *      required: true
       *      type: string
       *    responses:
       *      200:
       *        description: organization details for the matching id
       *        schema:
       *          $ref: '#/definitions/OrganizationPublic'
       *      400:
       *        description: bad input parameter
       *        schema:
       *          $ref: '#/definitions/ValidateError'
       *      401:
       *        description: Error user unauthorized
       *        schema:
       *          $ref: '#/definitions/UnauthorizedError'
       *      404:
       *        description: Error organization not found
       *        schema:
       *          properties:
       *            status:
       *              type: number
       *              example: 404
       *            error:
       *              type: string
       *              example: User not found
       */
      [
        'get', '/api/v1/organization',
        this.organizationValidator.getOrganization,
        this.getOrganization.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization:
       *  post:
       *    tags:
       *    - admins
       *    - organization
       *    summary: create or update an organization
       *    operationId: addOrganization
       *    description: Creates or updates an organizatioon in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: organization
       *      description: Organization to add or update
       *      schema:
       *        $ref: '#/definitions/Organization'
       *    responses:
       *      200:
       *        description: organization updated
       *        schema:
       *          $ref: '#/definitions/OrganizationPublic'
       *      201:
       *        description: organization created
       *        schema:
       *          $ref: '#/definitions/OrganizationPublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post', '/api/v1/organization',
        this.authValidator.loggedAdminOnly,
        this.organizationValidator.validateOrganization,
        this.createOrUpdateOrganization.bind(this)
      ]
    ];
  }

  async getOrganization(user, id) {
    try {
      return await this.organizationService.getOrganization(id);
    } catch (e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  createOrUpdateOrganization(user, organizationData) {
    return this.organizationService.createOrUpdateOrganization(organizationData);
  }

}

module.exports = OrganizationsController;
