import { Op } from 'sequelize';

import { model } from '../db/models/user.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';
import bcrypt from 'bcrypt';

const profileConstants = require('../constants/profile');


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

  async matchSellerPassword(organization_id, password) {
    const Sellers = await this.model.findAll({
      where: {
        [Op.and]: [{organization_id}, {user_type:profileConstants.userType.seller}, {status: profileConstants.status.active}]
      }
    });

    for(let i = 0; i < Sellers.length; i++){
      if(Sellers[i].password && await bcrypt.compare(password,Sellers[i].password)) {
        return Sellers[i];
      }
    }

    return null;
  }

  async findByPeerplaysID(peerplays_account_id) {
    return this.model.findOne({
      where: {peerplays_account_id}
    });
  }

  async findOrganizationAdmins(organization_id) {
    return this.model.findAll({
      where: {
        organization_id,
        user_type: profileConstants.userType.admin
      }
    });
  }
}

module.exports = UserRepository;
