import { model } from '../db/models/entry.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

class EntryRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

}

module.exports = EntryRepository;
