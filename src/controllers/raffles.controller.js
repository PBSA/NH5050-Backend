const RestError = require('../errors/rest.error');
const raffleValidator = require('../validators/raffle.validator');
const authValidator = require('../validators/auth.validator');
const raffleService = require('../services/raffle.service');

export default class RafflesController {
  constructor(conns) {
    this.raffleService = new raffleService(conns);
    this.raffleValidator = new raffleValidator();
    this.authValidator = new authValidator();
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
       * /raffles/{raffleId}:
       *  get:
       *    tags:
       *    - developers
       *    - raffles
       *    summary: get rafle details
       *    operationId: getRaffleById
       *    description: By passing in the raffleId, you can get details for a particular raffle
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: path
       *      name: raffleId
       *      description: pass the id of the raffle
       *      required: true
       *      type: integer
       *    responses:
       *      200:
       *        description: raffle details for the matching id
       *        schema:
       *          $ref: '#/definitions/RafflePublic'
       *      400:
       *        description: bad input parameter
       *        schema:
       *          $ref: '#/definitions/ValidateError'
       *      401:
       *        description: Error raffle unauthorized
       *        schema:
       *          $ref: '#/definitions/UnauthorizedError'
       *      404:
       *        description: Error raffle not found
       *        schema:
       *          properties:
       *            status:
       *              type: number
       *              example: 404
       *            error:
       *              type: string
       *              example: raffle not found
       */
      [
        'get', '/api/v1/raffles/:raffleId',
        this.raffleValidator.getRaffleById,
        this.getRaffleById.bind(this)
      ],
      /**
       * @swagger
       *
       * /raffles:
       *  get:
       *    tags:
       *    - developers
       *    - raffles
       *    summary: get list of raffles for an organization
       *    operationId: getRafflesByOrganization
       *    description: By passing in the organization_id, you can get a list of all the raffles of that organization
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: organizationId
       *      description: pass the id of the organization to get the list of raffles for
       *      required: true
       *      type: integer
       *    responses:
       *      200:
       *        description: search results matching criteria
       *        schema:
       *          type: array
       *          items:
       *            $ref: '#/definitions/RafflesPublic'
       *      400:
       *        description: bad input parameter
       *        schema:
       *          $ref: '#/definitions/ValidateError'
       */
      [
        'get', '/api/v1/raffles',
        this.raffleValidator.getRafflesByOrganization,
        this.getRafflesByOrganization.bind(this)
      ],
      /**
       * @swagger
       *
       * /raffles:
       *  post:
       *    tags:
       *    - developers
       *    - raffles
       *    summary: adds a new raffle or updates existing
       *    operationId: addRaffle
       *    description: Adds or updates a raffle in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: raffle
       *      description: raffle to add or update
       *      schema:
       *        $ref: '#/definitions/Raffle'
       *    responses:
       *      200:
       *        description: raffle updated
       *        schema:
       *          $ref: '#/definitions/RafflePublic'
       *      201:
       *        description: raffle created
       *        schema:
       *          $ref: '#/definitions/RafflePublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post','/api/v1/raffles',
        this.authValidator.loggedAdminOnly,
        this.raffleValidator.addRaffle,
        this.addRaffle.bind(this)
      ],
      /**
       * @swagger
       *
       * /raffles/ticketbundles:
       *  post:
       *    tags:
       *    - admin
       *    - raffles
       *    summary: adds a new bundle
       *    operationId: addBundle
       *    description: Adds a bundle in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: bundle
       *      description: bundle to add
       *      schema:
       *        $ref: '#/definitions/Bundle'
       *    responses:
       *      200:
       *        description: bundle created
       *        schema:
       *          $ref: '#/definitions/BundlePublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post','/api/v1/raffles/ticketbundles',
        this.authValidator.loggedAdminOnly,
        this.raffleValidator.addBundle,
        this.addBundle.bind(this)
      ],
      /**
       * @swagger
       *
       * /ticketbundles:
       *  get:
       *    tags:
       *    - developers
       *    - raffles
       *    summary: get ticket bundles
       *    operationId: getTicketBundles
       *    description: get all ticket bundles from database for a raffle
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: raffleId
       *      description: pass the raffle id for which to get bundles
       *      type: integer
       *      required: true
       *    responses:
       *      200:
       *        description: ticket bundles
       *        schema:
       *          $ref: '#/definitions/Bundles'
       *      400:
       *        description: bad input parameter
       */
      [
        'get', '/api/v1/ticketbundles',
        this.raffleValidator.getTicketBundles,
        this.getTicketBundles.bind(this)
      ],
      /**
       * @swagger
       *
       * /createpayment:
       *  get:
       *    tags:
       *    - developers
       *    - raffles
       *    summary: create payment intent
       *    operationId: createPayment
       *    description: get the ticket bundle id and return the client secret which will be required to initiate payment in the frontend
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: bundleId
       *      description: payment to be created
       *      type: integer
       *      required: true
       *    responses:
       *      200:
       *        description: client secret
       *        type: object
       *        properties:
       *          paymentId:
       *            type: string
       *          clientSecret:
       *            type: string
       *          publishableKey:
       *            type: string
       *      400:
       *        description: bad input parameter
       */
      [
        'get', '/api/v1/createpayment',
        this.raffleValidator.createPayment,
        this.createPayment.bind(this)
      ],
      [
        'post', '/api/v1/stripewebhook',
        this.stripePaymentWebhook.bind(this)
      ]
    ];
  }

  async getRaffleById(user, raffleId) {
    try {
      return await this.raffleService.getRaffle(raffleId);
    } catch (e) {
      if (e.message === this.raffleService.errors.NOT_FOUND) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async getRafflesByOrganization(user, organizationId) {
    try {
      return await this.raffleService.getRafflesByOrganizationId(organizationId);
    } catch (e) {
      throw new RestError(e.message, 500);
    }
  }

  async addRaffle(user, data) {
    return await this.raffleService.addRaffle(user, data);
  }

  async addBundle(user, data) {
    return await this.raffleService.addBundle(data);
  }

  async getTicketBundles(user, raffleId) {
    try{
      return await this.raffleService.getTicketBundles(raffleId);
    } catch (e) {
      throw new RestError(e.message, 500);
    }
  }

  async createPayment(user, price) {
    try{
      return await this.raffleService.createPayment(price);
    } catch (e) {
      throw new RestError(e.message, 500);
    }
  }

  stripePaymentWebhook(user, pure, req) {
    return this.raffleService.stripePaymentWebhook(req);
  }
}
