import { Op } from 'sequelize';

import { model } from '../db/models/sale.model';
import BasePostgresRepository from './abstracts/base-postgres.repository';
const saleConstants = require('../constants/sale');

class SaleRepository extends BasePostgresRepository {

  constructor() {
    super(model);
  }

  async findAll() {
    return this.model.findAll();
  }

  async findSuccessSales(raffle_id, options) {
    return this.model.findAll({
      where: {
        [Op.and]: [
        {raffle_id},
        {payment_status: saleConstants.paymentStatus.success}]
      },
      include: options.include
    });
  }

  async findSaleByStripePaymentId(stripe_payment_id, options) {
    return this.model.findOne({
      where: {stripe_payment_id}
    },options);
  }

  async findTotalSuccessSalesForRaffle(raffle_id) {
    return this.model.sum('total_price', {
      where: {
        raffle_id,
        payment_status: saleConstants.paymentStatus.success
      }
    });
  }

}

module.exports = SaleRepository;
