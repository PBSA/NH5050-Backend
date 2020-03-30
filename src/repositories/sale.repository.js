import { model } from '../db/models/sale.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';
import saleConstants from '../constants/sale';

class SaleRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

  async findSuccessSales() {
    return this.model.findAll({
      where: {
        payment_status: saleConstants.paymentStatus.success
      }
    });
  }

  async findSaleByStripePaymentId(stripe_payment_id, options) {
    return this.model.findOne({
      where: {stripe_payment_id}
    },options);
  }

}

module.exports = SaleRepository;
