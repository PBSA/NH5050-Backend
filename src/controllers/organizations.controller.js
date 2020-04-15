import RestError from '../errors/rest.error';
import OrganizationService from '../services/organization.service';
import FileService from '../services/file.service';
import AuthValidator from '../validators/auth.validator';
import OrganizationValidator from '../validators/organization.validator';

export default class OrganizationsController {

  constructor(conns) {
    this.organizationService = new OrganizationService(conns);
    this.fileService = new FileService(conns);
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
       *              example: organization not found
       */
      [
        'get', '/api/v1/organization',
        this.organizationValidator.validateOrganizationId,
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
       *    description: Creates or updates an organization in the database
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
      ],
      /**
       * @swagger
       *
       * /organization/uploadlogo:
       *  post:
       *    description: Add or change organization logo
       *    summary: Add or change organization logo
       *    produces:
       *      - application/json
       *    tags:
       *      - admins
       *      - organization
       *    parameters:
       *      - in: formData
       *        name: file
       *        type: file
       *        description: The file to upload.
       *    consumes:
       *      - multipart/form-data
       *    responses:
       *      200:
       *        description: Organization data
       *        schema:
       *          $ref: '#/definitions/OrganizationPublic'
       *      401:
       *        description: Error user unauthorized
       *        schema:
       *          $ref: '#/definitions/UnauthorizedError'
       *      400:
       *        description: Error form validation
       *        schema:
       *          $ref: '#/definitions/ValidateError'
       */
      [
        'post', '/api/v1/organization/uploadlogo',
        this.authValidator.loggedAdminOnly,
        this.uploadLogo.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/beneficiary:
       *  get:
       *    tags:
       *    - developers
       *    - organization
       *    summary: get beneficiaries as per organization id
       *    operationId: getBeneficiaries
       *    description: returns all beneficiaries for a given organization
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
       *        description: list of beneficiaries
       *        schema:
       *          type: array
       *          items:
       *            $ref: '#/definitions/OrganizationPublic'
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
       *              example: organization not found
       */
      [
        'get', '/api/v1/organization/beneficiary',
        this.organizationValidator.validateOrganizationId,
        this.getBeneficiaries.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/beneficiary:
       *  post:
       *    tags:
       *    - admins
       *    - organization
       *    summary: create or update a beneficiary
       *    operationId: addBeneficiary
       *    description: Creates or updates an beneficiary in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: beneficiary
       *      description: Beneficiary to add or update
       *      schema:
       *        $ref: '#/definitions/Organization'
       *    responses:
       *      200:
       *        description: beneficiary updated
       *        schema:
       *          $ref: '#/definitions/OrganizationPublic'
       *      201:
       *        description: beneficiary created
       *        schema:
       *          $ref: '#/definitions/OrganizationPublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post', '/api/v1/organization/beneficiary',
        this.authValidator.loggedAdminOnly,
        this.organizationValidator.validateOrganization,
        this.createOrUpdateBeneficiary.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/sellers:
       *  get:
       *    tags:
       *    - developers
       *    - organization
       *    summary: get sellers as per organization id
       *    operationId: getSellers
       *    description: returns all sellers for a given organization
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: organizationId
       *      description: pass the id of the organization
       *      required: true
       *      type: integer
       *    - in: query
       *      name: raffleId
       *      description: filter sales by the given raffle id
       *      required: false
       *      type: integer
       *    responses:
       *      200:
       *        description: list of sellers
       *        schema:
       *          type: array
       *          items:
       *            $ref: '#/definitions/UserPublic'
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
       *              example: organization not found
       */
      [
        'get', '/api/v1/organization/sellers',
        this.authValidator.loggedAdminOnly,
        this.organizationValidator.validateGetSellers,
        this.getSellers.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/sellers:
       *  post:
       *    tags:
       *    - admins
       *    - organization
       *    summary: create or update a seller
       *    operationId: addSeller
       *    description: Creates or updates a seller in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: seller
       *      description: seller to add or update
       *      schema:
       *        $ref: '#/definitions/User'
       *    responses:
       *      200:
       *        description: seller updated
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      201:
       *        description: seller created
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post', '/api/v1/organization/sellers',
        this.authValidator.loggedAdminOnly,
        this.authValidator.validatePlayerSignUp,
        this.createOrUpdateSeller.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/admins:
       *  get:
       *    tags:
       *    - developers
       *    - organization
       *    summary: get admins as per organization id
       *    operationId: getAdmins
       *    description: returns all admins for a given organization
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
       *        description: list of admins
       *        schema:
       *          type: array
       *          items:
       *            $ref: '#/definitions/UserPublic'
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
       *              example: organization not found
       */
      [
        'get', '/api/v1/organization/admins',
        this.authValidator.loggedAdminOnly,
        this.organizationValidator.validateOrganizationId,
        this.getAdmins.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/admins:
       *  post:
       *    tags:
       *    - admins
       *    - organization
       *    summary: create or update a admins
       *    operationId: addAdmin
       *    description: Creates or updates an admin in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: admin
       *      description: admin to add or update
       *      schema:
       *        $ref: '#/definitions/User'
       *    responses:
       *      200:
       *        description: admin updated
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      201:
       *        description: admin created
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post', '/api/v1/organization/admins',
        this.authValidator.loggedAdminOnly,
        this.authValidator.validatePlayerSignUp,
        this.createOrUpdateAdmin.bind(this)
      ],
      /**
       * @swagger
       *
       * /organization/admins:
       *  delete:
       *    tags:
       *    - admins
       *    - organization
       *    summary: delete admins
       *    operationId: addAdmin
       *    description: deletes an admin
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: userId
       *      description: user to delete
       *      schema:
       *        $ref: '#/definitions/User'
       *    responses:
       *      200:
       *        description: admin deleted
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'delete', '/api/v1/organization/admins',
        this.authValidator.loggedAdminOnly,
        this.deleteAdmin.bind(this)
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

  async createOrUpdateOrganization(user, organizationData) {
    try{
      return await this.organizationService.createOrUpdateOrganization(user, organizationData);
    } catch(e) {
      if(e.message == this.organizationService.errors.OTHER_ORGANIZATION || e.message == this.organizationService.errors.SUPER_ADMIN_ONLY) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async getBeneficiaries(user, organizationId) {
    try {
      return await this.organizationService.getBeneficiaries(organizationId);
    } catch (e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async createOrUpdateBeneficiary(user, organizationData) {
    try {
      return await this.organizationService.createOrUpdateBeneficiary(user.organization_id, organizationData);
    } catch(e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else if (e.message === this.organizationService.errors.INVALID_BENEFICIARY) {
        throw new RestError(e.message, 400);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async getSellers(user, {organizationId, raffleId}) {
    if (organizationId !== user.organization_id) {
      throw new RestError(`User does not belong to organization "${organizationId}"`,403);
    }

    try {
      return await this.organizationService.getSellers(organizationId, raffleId);
    } catch (e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async createOrUpdateSeller(user, sellerData) {
    try {
      return await this.organizationService.createOrUpdateSeller(user.organization_id, sellerData);
    } catch(e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async getAdmins(user, organizationId) {
    const isBeneficiary = await this.organizationService.isBeneficiaryOf(user.organization_id, organizationId);
    if (organizationId !== user.organization_id && !isBeneficiary) {
      throw new RestError(`User does not belong to the organization "${organizationId}"`, 403);
    }

    try {
      return await this.organizationService.getAdmins(organizationId);
    } catch (e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async createOrUpdateAdmin(user, adminData) {
    try {
      return await this.organizationService.createOrUpdateAdmin(user.organization_id, adminData);
    } catch(e) {
      if (e.message === this.organizationService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async deleteAdmin(user, adminId) {
    return await this.organizationService.deleteAdmin(user.organization_id, adminId);
  }

  async uploadLogo(user, data, req, res) {
    const url = await this.fileService.saveImage(req, res);
    return await this.organizationService.setLogoUrl(user.organization_id, url);
  }

}
