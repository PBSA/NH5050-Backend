import { model } from '../db/models/raffle.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

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

}

module.exports = RaffleRepository;
