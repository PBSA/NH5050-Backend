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
const dbConnection = require('./db');

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
  constructor() {
    this.app = null;
    this.server = null;
  }

  init() {
    return new Promise((resolve) => {
      this.app = express();
      this.app.use(bodyParser.urlencoded({extended: true}));
      this.app.use(bodyParser.json());

      if (config.cors) {
        const corsOptions = {
          origin: (origin, callback) => {
            callback(null, true);
          },
          credentials: true,
          methods: ['GET', 'PUT', 'POST', 'OPTIONS', 'DELETE', 'PATCH'],
          headers: ['x-user', 'X-Signature', 'accept', 'content-type']
        };

        this.app.use(cors(corsOptions));
        this.app.options('*', cors());
      }

      const SessionStore = new SequelizeStore({
        db: dbConnection.sequelize,
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
        resolve();
      });
    });
  }

  close() {
    this.server.close();
  }
}


module.exports = Server;