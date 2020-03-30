import RestError from '../errors/rest.error';
import RaffleService from '../services/raffle.service';
import FileService from '../services/file.service';
import RaffleValidator from '../validators/raffle.validator';
import AuthValidator from '../validators/auth.validator';

export default class RafflesController {
  constructor(conns) {
    this.raffleService = new RaffleService(conns);
    this.fileService = new FileService(conns);
    this.raffleValidator = new RaffleValidator();
    this.authValidator = new AuthValidator();
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
       * /raffles/uploadimage:
       *  post:
       *    description: Add or change raffle image
       *    summary: Add or change raffle image
       *    produces:
       *      - application/json
       *    tags:
       *      - admins
       *      - raffles
       *    parameters:
       *      - in: formData
       *        name: file
       *        type: file
       *        description: The file to upload.
       *    consumes:
       *      - multipart/form-data
       *    responses:
       *      200:
       *        description: Raffle data
       *        schema:
       *          $ref: '#/definitions/RafflePublic'
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
        'post', '/api/v1/raffles/uploadimage',
        this.authValidator.loggedAdminOnly,
        this.uploadImage.bind(this)
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
      ],
      /**
       * @swagger
       *
       * /raffles/initpurchase:
       *  post:
       *    tags:
       *    - developer
       *    - raffles
       *     summary: initiate stripe ticket purchase for the raffle
       *     operationId: initStripeTicketPurchase
       *     description: Start buying a ticket for the raffle using stripe
       *     consumes:
       *     - application/json
       *     produces:
       *     - application/json
       *     parameters:
       *     - in: body
       *       name: raffle
       *       description: ticket sale object with details of ticket to be purchased
       *       schema:
       *         $ref: '#/definitions/TicketSale'
       *     responses:
       *       200:
       *         description: ticket purchase started
       *         schema:
       *           $ref: '#/definitions/TicketSalePublic'
       *       400:
       *         description: invalid input, object invalid
       */
      [
        'post', '/api/v1/raffles/initpurchase',
        this.raffleValidator.initStripeTicketPurchase,
        this.initStripeTicketPurchase.bind(this)
      ],
      /**
       * @swagger
       *
       * /raffles/ticketpurchase:
       *  post:
       *    tags:
       *    - developer
       *    - raffles
       *     summary: complete ticket purchase for the raffle
       *     operationId: ticketPurchase
       *     description: Complete buying a ticket for the raffle
       *     consumes:
       *     - application/json
       *     produces:
       *     - application/json
       *     parameters:
       *     - in: body
       *       name: raffle
       *       description: ticket sale object with details of ticket to be purchased
       *       schema:
       *         $ref: '#/definitions/TicketSale'
       *     responses:
       *       200:
       *         description: ticket purchase completed
       *         schema:
       *           $ref: '#/definitions/EntriesPublic'
       *       400:
       *         description: invalid input, object invalid
       */
      [
        'post', '/api/v1/raffles/ticketpurchase',
        this.raffleValidator.ticketPurchase,
        this.ticketPurchase.bind(this)
      ],
      /**
       * @swagger
       *
       * /ticketsales/{raffleId}:
       *  get:
       *    tags:
       *    - developers
       *    - raffles
       *    summary: get all tickets sold for a raffle
       *    operationId: getTicketSales
       *    description: get all tickets sold for the raffle with given id
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
       *        description: all ticket sales
       *        schema:
       *          $ref: '#/definitions/TicketSalesPublic'
       *      400:
       *        description: bad input parameter
       */
      [
        'get','/api/v1/ticketSales/:raffleId',
        this.raffleValidator.getRaffleById,
        this.getTicketSales.bind(this)
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
    try{
      return await this.raffleService.addRaffle(user, data);
    } catch(e) {
      if (e.message === this.raffleService.errors.INSUFFICIENT_BALANCE || e.message === this.raffleService.errors.PEERPLAYS_ACCOUNT_MISSING) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
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

  async uploadImage(user, data, req, res) {
    const url = await this.fileService.saveImage(req, res);
    return await this.raffleService.setImageUrl(user.organization_id, url);
  }

  async initStripeTicketPurchase(user, body) {
    return this.raffleService.initStripeTicketPurchase(body);
  }

  async ticketPurchase(user, body) {
    try{
      return await this.raffleService.ticketPurchase(body);
    } catch(e) {
      if (e.message === this.raffleService.errors.INSUFFICIENT_BALANCE || e.message === this.raffleService.errors.PEERPLAYS_ACCOUNT_MISSING) {
        throw new RestError(e.message, 404);
      } else {
        throw new RestError(e.message, 500);
      }
    }
  }

  async getTicketSales(user, raffleId) {
    return this.raffleService.getTicketSales(raffleId);
  }
}
