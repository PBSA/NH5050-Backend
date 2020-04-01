import { model } from '../db/models/bundle.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

class BundleRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

  async findBundlesByRaffleId(raffle_id) {
    return this.model.findAll({
      where: {raffle_id}
    });
  }

}

module.exports = BundleRepository;
