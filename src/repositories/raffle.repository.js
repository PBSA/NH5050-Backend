import {Op} from 'sequelize';

import { model } from '../db/models/raffle.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';
const moment = require('moment');

class RaffleRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

  async findRafflesByOrganizationId(organization_id) {
    return this.model.findAll({
      where: {organization_id}
    });
  }

  async findPendingRaffles() {
    return this.model.findAll({
      where: {
        draw_datetime: {
          [Op.lt]: moment()
        },
        winner_id: {
          [Op.eq]: null
        }
      }
    })
  }
}

module.exports = RaffleRepository;
