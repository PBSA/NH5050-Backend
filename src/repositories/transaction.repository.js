import { model } from '../db/models/transaction.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

class TransactionRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

}

module.exports = TransactionRepository;
