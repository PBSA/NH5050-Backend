import RestError from '../errors/rest.error';
import OrganizationService from '../services/organization.service';
import OrganizationValidator from '../validators/organization.validator';

class OrganizationsController {

  constructor() {
    this.organizationService = new OrganizationService();
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
      ]
    ];
  }

  async getOrganization(id) {
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

}

module.exports = OrganizationsController;
