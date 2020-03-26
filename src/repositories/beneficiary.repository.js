import { model } from '../db/models/beneficiary.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';

export default class BeneficiaryRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

}
