import { Op } from 'sequelize';

import { model } from '../db/models/user.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

class UserRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

  async getByEmailOrMobile(email, mobile) {
    return this.model.findOne({
      where: {[Op.or]: [{email}, {mobile: this.normalizePhoneNumber(mobile)}]}
    });
  }

  normalizePhoneNumber(mobile) {
    var number = mobile;
    number = number.replace(/[^\d+]+/g, '');
    number = number.replace(/^00/, '+');

    if (number.match(/^1/)) { 
      number = '+' + number;
    }

    if (!number.match(/^\+/)) {
      number = '+1' + number;
    }

    return number;
  }

  async findByEmail(email) {
    return this.model.findOne({
      where: {email}
    });
  }

}

module.exports = UserRepository;
