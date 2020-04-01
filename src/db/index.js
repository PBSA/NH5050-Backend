import fs from 'fs';
import path from 'path';
import config from 'config';
import Sequelize from 'sequelize';

const host = config.get('db.host');
const port = config.get('db.port');
const database = config.get('db.database');
const username = config.get('db.user');
const password = config.get('db.password');

const sequelize = new Sequelize(database, username, password, {
  host,
  port,
  logging: console.debug,
  dialect: 'postgres'
});

var db = {};

fs
  .readdirSync(path.join(__dirname, 'models'))
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const Model = require(`../db/models/${file}`);
    Model.init(sequelize);
    const name = file.replace(/\.model\.js/, '').toLowerCase()
      .split('.')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    db[name] = Model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
