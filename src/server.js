const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
let swaggerDef = require('./swagger-definition.js');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const config = require('config');
const db = require('./db');
const usersController = require('./controllers/users.controller');
const RestError = require('./errors/rest.error');
const MethodNotAllowedError = require('./errors/method-not-allowed.error');

/**
 * @swagger
 *
 * definitions:
 *  SuccessResponse:
 *    type: object
 *    properties:
 *      status:
 *        type: number
 *        default: 200
 *        example: 200
 *  SuccessEmptyResponse:
 *    allOf:
 *      - $ref: '#/definitions/SuccessResponse'
 *      - type: object
 *        properties:
 *          result:
 *            type: boolean
 *            example: true
 */
/**
 * A namespace.
 * @namespace api
 * @class Server
 */
class Server {
  constructor(conns) {
    this.conns = conns;
    this.app = null;
    this.server = null;
    this.peerplaysConnection = conns.peerplaysConnection;
    this.usersController = new usersController(conns);
  }

  init() {
    return new Promise((resolve) => {
      this.app = express();
      this.app.use(bodyParser.urlencoded({extended: true}));
      this.app.use(bodyParser.json());

      if (config.cors) {
        const corsOptions = {
          origin: config.frontendUrl,
          credentials: true,
          methods: ['GET', 'PUT', 'POST', 'OPTIONS', 'DELETE', 'PATCH'],
          headers: ['x-user', 'X-Signature', 'accept', 'content-type']
        };

        this.app.use(cors(corsOptions));
        this.app.options('*', cors());
      }

      const SessionStore = new SequelizeStore({
        db: db.sequelize,
        modelKey: 'Sessions'
      });

      this.app.use(session({
        name: 'crypto.sid',
        secret: config.sessionSecret,
        cookie: {maxAge: 7 * 24 * 60 * 60 * 1000}, // 7 days
        resave: false,
        saveUninitialized: false,
        rolling: true,
        store: SessionStore
      }));

      this.app.use(passport.initialize());
      this.app.use(passport.session());

      if (process.env.NODE_ENV != 'production') {
        this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerJSDoc({
          definition: swaggerDef,
          apis: swaggerDef.apis
        })));
      }

      this.server = this.app.listen(config.port, () => {
        console.log(`API APP REST listen ${config.port} Port`);
        this._initRestRoutes();
        resolve();
      });
    });
  }

  /**
   * Bind routers
   */
  _initRestRoutes() {
    [
      this.usersController
    ].forEach((controller) => controller.getRoutes(this.app).forEach((route) => {
      this.addRestHandler(...route);
    }));

    this.addRestHandler('use', '*', () => {
      throw new MethodNotAllowedError();
    });
  }

  /** @typedef {('get','post','patch','use')} Method */

  /**
   * @param {Method} method
   * @param {String} route
   * @param args
   */
  addRestHandler(method, route, ...args) {
    const action = args.pop();
    this.app[method](route, async (req, res) => {
      try {
        await args.reduce(async (previousPromise, handler) => {
          await previousPromise;
          return handler()(req, res);
        }, Promise.resolve());

        const result = await action(req.user, req.pure, req, res);
        return res.status(200).json({
          result: result || null,
          status: 200
        });
      } catch (error) {
        let restError = error;

        if (!(error instanceof RestError)) {
          /* istanbul ignore next */
          console.error(error);
          /* istanbul ignore next */
          restError = {
            status: 500,
            message: 'server side error'
          };
        }

        return res.status(restError.status).json({
          error: restError.details || restError.message,
          status: restError.status
        });
      }
    });
  }

  close() {
    this.server.close();
  }
}


module.exports = Server;