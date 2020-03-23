const RestError = require('../errors/rest.error');
const authValidator = require('../validators/auth.validator');
const userValidator = require('../validators/user.validator');
const userService = require('../services/user.service');

/**
 * @swagger
 *
 * definitions:
 *  UsersChangeNotificationsStatus:
 *    type: object
 *    required:
 *      - notifications
 *    properties:
 *      notifications:
 *        type: boolean
 *  UsersChangeInvitationsStatus:
 *    type: object
 *    required:
 *      - invitations
 *      - minBounty
 *    properties:
 *      invitations:
 *        type: string
 *      users:
 *        type: array
 *        items:
 *          type: integer
 *      games:
 *        type: array
 *        description: Names of games from which user can accepts invitations
 *        items:
 *          type: string
 *      minBounty:
 *        type: number
 *        description: Minimum bounty allowed for invitations
 *
 */

class UsersController {
  constructor(conns) {
    this.userService = new userService(conns);
    this.userValidator = new userValidator();
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
       * /users/{id}:
       *  get:
       *    tags:
       *    - developers
       *    - users
       *    summary: get user details
       *    operationId: getUserById
       *    description: By passing in the id, you can get details for a particular user
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: path
       *      name: id
       *      description: pass the id of the user
       *      required: true
       *      type: string
       *    responses:
       *      200:
       *        description: user details for the matching id
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      400:
       *        description: bad input parameter
       *        schema:
       *          $ref: '#/definitions/ValidateError'
       *      401:
       *        description: Error user unauthorized
       *        schema:
       *          $ref: '#/definitions/UnauthorizedError'
       *      404:
       *        description: Error user not found
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
        'get', '/api/v1/users/:id',
        this.userValidator.getUser,
        this.authValidator.loggedAdminOnly,
        this.getUser.bind(this)
      ],
      /**
       * @swagger
       *
       * /users:
       *  get:
       *    tags:
       *    - developers
       *    - users
       *    summary: searches for users
       *    operationId: searchUsers
       *    description: By passing in the mobile and email, you can search for a particular user
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: query
       *      name: mobile
       *      description: pass the mobile number of the user to search for
       *      required: true
       *      type: string
       *    - in: query
       *      name: email
       *      description: pass the email id of the user to search for
       *      required: true
       *      type: string
       *      format: email
       *    responses:
       *      200:
       *        description: search results matching criteria
       *        schema:
       *          type: array
       *          items:
       *            $ref: '#/definitions/UsersPublic'
       *      400:
       *        description: bad input parameter
       *        schema:
       *          $ref: '#/definitions/ValidateError'
       *      404:
       *        description: Error user not found
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
        'get', '/api/v1/users',
        this.userValidator.getUsers,
        this.getUsers.bind(this)
      ],
      /**
       * @swagger
       *
       * /users:
       *  post:
       *    tags:
       *    - developers
       *    - users
       *    summary: adds a new user or updates existing
       *    operationId: addUser
       *    description: Adds or updates a user in the database
       *    consumes:
       *    - application/json
       *    produces:
       *    - application/json
       *    parameters:
       *    - in: body
       *      name: user
       *      description: User to add or update
       *      schema:
       *        $ref: '#/definitions/User'
       *    responses:
       *      200:
       *        description: user updated
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      201:
       *        description: user created
       *        schema:
       *          $ref: '#/definitions/UserPublic'
       *      400:
       *        description: invalid input, object invalid
       */
      [
        'post','/api/v1/users',
        this.authValidator.validatePlayerSignUp,
        this.playerSignup.bind(this)
      ]
    ];
  }

  async getUser(user, id) {
    try {
      return await this.userService.getUser(id);
    } catch (e) {
      throw new RestError(e.message, 404);
    }
  }

  async getUsers(user, {email, mobile}) {
    try {
      return await this.userService.searchUsers(email, mobile);
    } catch (e) {
      throw new RestError(e.message, 404);
    }
  }

  async playerSignup(user, data, req) {
    return await this.userService.signUp(req, data);
  }

}

module.exports = UsersController;
