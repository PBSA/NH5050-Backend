import { model } from '../db/models/organization.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

class OrganizationRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

}

module.exports = OrganizationRepository;
