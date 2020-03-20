const config = require('config');

module.exports = {
  info: {
    title: 'NH5050',
    version: '1',
    description: 'APIs for NH5050'
  },
  host: config.swagger.host,
  apis: [],
  basePath: '/api/v1',
  schemes: config.swagger.schemes
};
