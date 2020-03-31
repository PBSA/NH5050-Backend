const RestError = require('../errors/rest.error');
const ValidateError = require('../errors/validate.error');

const RaffleRepository = require('../repositories/raffle.repository');
const BundleRepository = require('../repositories/bundle.repository');
const UserRepository = require('../repositories/user.repository');
const PeerplaysRepository = require('../repositories/peerplays.repository');
const SaleRepository = require('../repositories/sale.repository');
const EntryRepository = require('../repositories/entry.repository');
const TransactionRepository = require('../repositories/transaction.repository');
const OrganizationRepository = require('../repositories/organization.repository');
const BeneficiaryRepository = require('../repositories/beneficiary.repository').default;
const saleConstants = require('../constants/sale');
const transactionConstants = require('../constants/transaction');
const MailService = require('../services/mail.service');
const {Login} = require('peerplaysjs-lib');
const config = require('config');
const stripe = require('stripe')(config.stripe.secretKey);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default class RaffleService {
  constructor(conns) {
    this.raffleRepository = new RaffleRepository();
    this.userRepository = new UserRepository();
    this.peerplaysRepository = new PeerplaysRepository(conns);
    this.bundleRepository = new BundleRepository();
    this.saleRepository = new SaleRepository();
    this.entryRepository = new EntryRepository();
    this.transactionRepository = new TransactionRepository();
    this.organizationRepository = new OrganizationRepository();
    this.beneficiaryRepository = new BeneficiaryRepository();
    this.mailService = new MailService(conns);

    this.errors = {
      NOT_FOUND: 'Raffle not found',
      PEERPLAYS_ACCOUNT_MISSING: 'Peerplays account missing',
      INSUFFICIENT_BALANCE: 'Insufficient balance'
    };
  }

  async getRaffle(raffleId) {
    const raffle = await this.raffleRepository.findByPk(raffleId, {
      include: [{
        model: this.userRepository.model
      }]
    });

    if (!raffle) {
      throw new Error(this.errors.NOT_FOUND);
    }

    return raffle.getPublic();
  }

  async getRafflesByOrganizationId(organizationId) {
    return this.raffleRepository.findRafflesByOrganizationId(organizationId);
  }

  async addRaffle(user, newRaffle) {
    if(newRaffle.id) {
      const raffleExists = await this.raffleRepository.findByPk(id);

      Object.assign(raffleExists, newRaffle);

      raffleExists.save();
      return raffleExists.getPublic();
    }

    if(!user.peerplays_account_name || !user.peerplays_master_password) {
      throw new Error(this.errors.PEERPLAYS_ACCOUNT_MISSING);
    }

    const keys = Login.generateKeys(
      user.peerplays_account_name,
      user.peerplays_master_password,
      ['active'],
      IS_PRODUCTION ? 'PPY' : 'TEST'
    );

    let lotteryResult;
    try{
      lotteryResult = await this.peerplaysRepository.createLottery(user.peerplays_account_id, newRaffle.raffle_name, newRaffle.raffle_description, newRaffle.draw_datetime, keys.privKeys.active);
    }catch(e) {
      console.error(e);

      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    const Raffle = await this.raffleRepository.model.create({
      raffle_name: newRaffle.raffle_name,
      raffle_description: newRaffle.raffle_description,
      slug: newRaffle.slug,
      organization_id: newRaffle.organization_id,
      start_datetime: newRaffle.start_datetime,
      end_datetime: newRaffle.end_datetime,
      draw_datetime: newRaffle.draw_datetime,
      draw_type: newRaffle.draw_type,
      progressive_draw_id: newRaffle.progressive_draw_id,
      admin_fees_percent: newRaffle.admin_fees_percent,
      donation_percent: newRaffle.donation_percent,
      raffle_draw_percent: newRaffle.raffle_draw_percent,
      progressive_draw_percent: newRaffle.progressive_draw_percent,
      organization_percent: newRaffle.organization_percent,
      beneficiary_percent: newRaffle.beneficiary_percent,
      peerplays_draw_id: lotteryResult.trx.operation_results[0][1]
    });

    return Raffle.getPublic();
  }

  async addBundle(data) {
    const Bundle = await this.bundleRepository.model.create({
      ...data
    });
    return Bundle.getPublic();
  }

  async getTicketBundles(raffleId) {
    const Bundles = await this.bundleRepository.findBundlesByRaffleId(raffleId);
    return Bundles.map((bundle)=> bundle.getPublic());
  }

  async createPayment(price) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price*100,
      currency: 'usd',
      // Verify your integration in this guide by including this parameter
      metadata: {integration_check: 'accept_a_payment'},
    });

    return {
      paymentId: paymentIntent.id, 
      clientSecret: paymentIntent.client_secret, 
      publishableKey: config.stripe.publishableKey
    };
  }

  async stripePaymentWebhook(req) {
    const {rawBody, headers} = req;

    const sig = headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, config.stripe.endpointSecret);
    }
    catch (err) {
      throw new ValidateError(400, 'Validate error', `Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const SaleExists = await this.saleRepository.findSaleByStripePaymentId(paymentIntent.id);
        if(SaleExists.length > 0 && SaleExists.payment_status !== saleConstants.paymentStatus.success) {
          await this.processPurchase(SaleExists[0].get({plain: true}));
        }
        break;
      case 'payment_intent.canceled':
        const paymentId = event.data.object.id;
        const CancelSaleExists = await this.saleRepository.findSaleByStripePaymentId(paymentId);
        if(CancelSaleExists.length > 0) {
          CancelSaleExists[0].payment_status = saleConstants.paymentStatus.cancel;
          await CancelSaleExists[0].save();
        }
        break;
      default:
        // Unexpected event type
        throw new ValidateError(400, 'Validate error', 'Unexpected Response');
    }

    // Return a response to acknowledge receipt of the event
    return {received: true};
  }

  async deleteImageFromCDN(raffle) {
    if (raffle.image_url && raffle.image_url.startsWith(config.cdnUrl)) {
      await this.fileService.delete('pics/' + path.basename(raffle.image_url));
    }
  }

  async setImageUrl(id, imageUrl) {
    const raffle = await this.raffleRepository.findByPk(id);

    if (!raffle) {
      throw new Error(this.errors.NOT_FOUND);
    }

    await this.deleteImageFromCDN(raffle);

    raffle.image_url = imageUrl;
    await raffle.save();
    return raffle.getPublic();
  }

  async initStripeTicketPurchase(sale) {
    return await this.saleRepository.model.create({
      ...sale
    });
  }

  async ticketPurchase(sale) {
    if(sale.payment_type == saleConstants.paymentType.stripe) {
      const SaleExists = await this.saleRepository.findSaleByStripePaymentId(sale.stripe_payment_id,{
        include: [{
          model: this.userRepository.model,
          as: 'player'
        },{
          model: this.bundleRepository.model,
          as: 'bundle'
        },{
          model: this.beneficiaryRepository.model,
          as: 'beneficiary'
        },{
          model: this.userRepository.model,
          as: 'seller'
        }]
      });

      if(SaleExists && SaleExists.length > 0 && SaleExists[0].payment_status === saleConstants.paymentStatus.success) {
        const Entries = await this.entryRepository.findAll({
          where: {
            ticket_sales_id: SaleExists[0].id
          }
        });

        if(Entries.length > 0) {
          return {
            entries: this.getEntriesArray(Entries),
            ticket_sales: {
              ...SaleExists[0].get({plain: true}),
              player: SaleExists[0].player.getPublic(),
              ticket_bundle: SaleExists[0].bundle.getPublic(),
              beneficiary: SaleExists[0].beneficiary.get({plain: true}),
              seller: SaleExists[0].seller.getPublic()
            }
          };
        }
      }

      let paymentIntent;

      try{
        paymentIntent = await stripe.paymentIntents.retrieve(sale.stripe_payment_id);
      }catch(err) {
        throw new RestError(err.message, 404);
      }

      if(paymentIntent.status === 'canceled') {
        SaleExists[0].payment_status = saleConstants.paymentStatus.cancel;
        await SaleExists[0].save();

        throw new RestError('Payment canceled', 404);
      }

      if(paymentIntent.status !== 'succeeded') {
        throw new RestError('Processing payment. You can close this window. We will send you an email once the payment has been processed.', 404);
      }
    }

    return await this.processPurchase(sale);
  }

  async processPurchase(sale) {
    const Sale = await this.saleRepository.model.upsert({
      ...sale,
      payment_status: saleConstants.paymentStatus.success
    },{ returning: true });

    const bundle = await this.bundleRepository.findByPk(sale.ticketbundle_id, {
      include: [{
        model: this.raffleRepository.model
      }]
    });

    const player = await this.userRepository.findByPk(sale.player_id);

    if(!player.peerplays_account_name || !player.peerplays_master_password) {
      throw new Error(this.errors.PEERPLAYS_ACCOUNT_MISSING);
    }

    try{
      await this.transferfromPaymentToPlayer(bundle.price, player.peerplays_account_id, sale.payment_type);
    } catch(e) {
      console.error(e);
      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    try{
      await this.peerplaysRepository.sendPPYFromPaymentAccount(player.peerplays_account_id, bundle.quantity);
    } catch(e) {
      console.error(e);
      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    let normalRaffleResult;

    try{
      normalRaffleResult = await this.peerplaysRepository.purchaseTicket(bundle.raffle.peerplays_draw_id, bundle.quantity, player);
    }catch(e) {
      console.error(e);
      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    try{
      await this.transferFromPlayerToEscrow(bundle.price, bundle.raffle_id, player.peerplays_account_id, player.peerplays_account_name, player.peerplays_master_password);
    } catch(e) {
      console.error(e);
      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    let progressiveRaffleResult;

    if(bundle.raffle.progressive_draw_id) {
      const progressiveRaffle = await this.raffleRepository.findByPk(bundle.raffle.progressive_draw_id);

      try{
        progressiveRaffleResult = await this.peerplaysRepository.purchaseTicket(progressiveRaffle.peerplays_draw_id, bundle.quantity, player);
      }catch(e) {
        console.error(e);
        if (e.message.includes('insufficient')) {
          throw new Error(this.errors.INSUFFICIENT_BALANCE);
        }

        throw e;
      }
    }

    let Entries = [];

    for(let i = 0; i < bundle.quantity; i++) {
      let entry = await this.entryRepository.model.create({
        ticket_sales_id: Sale[0].id,
        peerplays_raffle_ticket_id: normalRaffleResult.id,
        peerplays_progressive_ticket_id: progressiveRaffleResult.id
      });
      Entries.push(entry);
    }

    await this.mailService.sendTicketPurchaseConfirmation(player.firstname, player.email, Entries, bundle.raffle.raffle_name, bundle.raffle_id);

    const beneficiary = await this.beneficiaryRepository.findByPk(Sale[0].beneficiary_id, {
      include: [{
        model: this.organizationRepository.model,
        as: 'user'
      }]
    });

    return {
      entries: this.getEntriesArray(Entries),
      ticket_sales: {
        ...Sale[0].get({plain: true}),
        player: player.getPublic(),
        ticket_bundle: bundle.getPublic(),
        beneficiary: {
          ...beneficiary.get({plain: true}),
          user: beneficiary.user.getPublic()
        }
      }
    };
  }

  getEntriesArray(Entries) {
    let entries = [];
    Entries.forEach((entry)=> entries.push({id:entry.id}));
    return entries;
  }

  async transferfromPaymentToPlayer(amount, accountId, paymentType) {
    const result = await this.peerplaysRepository.sendUSDFromPaymentAccount(accountId, amount);
    await this.transactionRepository.model.create({
      transfer_from: result.trx.operations[0][1].from,
      transfer_to: result.trx.operations[0][1].to,
      peerplays_block_num: result.block_num,
      peerplays_transaction_ref: result.trx_num,
      amount,
      transaction_type: paymentType === saleConstants.paymentType.cash ?
        transactionConstants.transactionType.cashBuy :
        transactionConstants.transactionType.stripeBuy
    });
  }

  async transferFromPlayerToEscrow(amount, raffleId, playerId, playerAccountName, playerMasterPassword) {
    const keys = Login.generateKeys(
      playerAccountName,
      playerMasterPassword,
      ['active'],
      IS_PRODUCTION ? 'PPY' : 'TEST'
    );

    const result = await this.peerplaysRepository.sendPPY(config.peerplays.paymentReceiver, amount, playerId, keys.privKeys.active, config.peerplays.sendAssetId);
    await this.transactionRepository.model.create({
      transfer_from: result.trx.operations[0][1].from,
      transfer_to: result.trx.operations[0][1].to,
      raffle_id: raffleId,
      peerplays_block_num: result.block_num,
      peerplays_transaction_ref: result.trx_num,
      amount,
      transaction_type: transactionConstants.transactionType.ticketPurchase
    });
  }

  async getTicketSales(raffle_id) {
    const sales = await this.saleRepository.findSuccessSales(raffle_id,{
      include: [{
        model: this.userRepository.model,
        as: 'player'
      }, {
        model: this.bundleRepository.model,
        as: 'bundle'
      }, {
        model: this.beneficiaryRepository.model,
        as: 'beneficiary',
        include: [{
          model: this.organizationRepository.model,
          as: 'user'
        }]
      }, {
        model: this.userRepository.model,
        as: 'seller'
      }]
    });

    return sales.map((sale) => {
      return {
        ...sale.get({plain: true}),
        player: sale.player.getPublic(),
        bundle: sale.bundle.getPublic(),
        beneficiary: {
          ...sale.beneficiary.get({plain: true}),
          user: sale.beneficiary.user.getPublic()
        },
        seller: sale.seller ? sale.seller.getPublic() : null
      };
    });
  }

  async getTicketSaleDetails(ticketId) {
    const Sale = await this.saleRepository.findByPk(ticketId,{
      include: [{
        model: this.userRepository.model,
        as: 'player'
      },{
        model: this.bundleRepository.model,
        as: 'bundle'
      },{
        model: this.beneficiaryRepository.model,
        as: 'beneficiary',
        include: [{
          model: this.organizationRepository.model,
          as: 'user'
        }]
      },{
        model: this.userRepository.model,
        as: 'seller'
      }]
    });

    const Entries = await this.entryRepository.findAll({
      where: {
        ticket_sales_id: ticketId
      }
    });

    return {
      entries: this.getEntriesArray(Entries),
      ticket_sales: {
        ...Sale.get({plain: true}),
        player: Sale.player.getPublic(),
        bundle: Sale.bundle.getPublic(),
        beneficiary: {
          ...Sale.beneficiary.get({plain: true}),
          user: Sale.beneficiary.user.getPublic()
        },
        seller: Sale.seller ? Sale.seller.getPublic() : null
      }
    };
  }
}
