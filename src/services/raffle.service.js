const {randomBytes} = require('crypto');
const {Login} = require('peerplaysjs-lib');
const config = require('config');
const stripe = require('stripe')(config.stripe.secretKey);
const {Op} = require('sequelize');
const json2csv = require('json2csv');

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
const raffleConstants = require('../constants/raffle');
const MailService = require('../services/mail.service');
const FileService = require('../services/file.service').default;
const RestError = require('../errors/rest.error');
const ValidateError = require('../errors/validate.error');
const sequelize = require('../db/index').sequelize;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CDN_URL = config.get('cdnUrl');

function padZeros(num, totalDigitsRequired) {
  var str = num + "";
  while (str.length < totalDigitsRequired) str = "0" + str;
  return str;
}

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
    this.fileService = new FileService(conns);

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

    let amounts;
    if(raffle.draw_type === raffleConstants.drawType.progressive) {
      amounts = await this.calculateProgressiveAmounts(raffle.id);
    } else {
      amounts = await this.calculateAmounts(raffle);
    }

    return {
      ...raffle.getPublic(),
      ...amounts,
      winner: raffle.user ? raffle.user.getPublic() : null
    };
  }

  async calculateAmounts(raffle) {
    const totalSales = await this.saleRepository.findTotalSuccessSalesForRaffle(raffle.id);

    let totalProgressiveJackpot = 0;
    const rafflesInProgressive = await this.raffleRepository.model.findAll({
      where: {
        progressive_draw_id: raffle.progressive_draw_id
      }
    });

    for(let i = 0; i < rafflesInProgressive.length; i++) {
      totalProgressiveJackpot += (await this.saleRepository.findTotalSuccessSalesForRaffle(rafflesInProgressive[i].id) * rafflesInProgressive[i].progressive_draw_percent / 100);
    }

    const numBeneficiaries = await this.beneficiaryRepository.model.count({where: {
      organization_id: raffle.organization_id
    }});

    return {
      total_jackpot: (totalSales * raffle.raffle_draw_percent / 100).toFixed(2),
      total_progressive_jackpot: totalProgressiveJackpot.toFixed(2),
      each_beneficiary_amount: ((totalSales * raffle.beneficiary_percent / 100)/numBeneficiaries).toFixed(2),
      organization_amount: (totalSales * raffle.organization_percent / 100).toFixed(2),
      admin_fee_amount: (totalSales * raffle.admin_fees_percent / 100).toFixed(2),
      donation_amount: (totalSales * raffle.donation_percent / 100).toFixed(2)
    };
  }

  async getRafflesByOrganizationId(organizationId) {
    const raffles = await this.raffleRepository.findRafflesByOrganizationId(organizationId);

    return Promise.all(raffles.map(async (raffle) => {
      let amounts;
      let totalEntries;

      if(raffle.draw_type === raffleConstants.drawType.progressive) {
        amounts = await this.calculateProgressiveAmounts(raffle.id);
        totalEntries = await this.getTotalEntriesForProgressiveRaffle(raffle.id);
      } else {
        amounts = await this.calculateAmounts(raffle);
        totalEntries = await this.getTotalEntriesForRaffle(raffle.id);
      }

      return {
        ...raffle.getPublic(),
        ...amounts,
        total_entries: totalEntries
      };
    }));
  }

  async getTotalEntriesForRaffle(raffle_id) {
    const [entries] = await this.entryRepository.model.findAll({
      where: {
        '$sale.raffle_id$': raffle_id,
        '$sale.payment_status$': saleConstants.paymentStatus.success
      },
      attributes: [
        [sequelize.fn('count', sequelize.col('entries.id')), 'entries_count']
      ],
      include: [{
        model: this.saleRepository.model,
        as: 'sale',
        attributes: ['raffle_id','payment_status']
      }],
      group: ['sale.payment_status','sale.raffle_id'],
      raw: true
    });

    return entries ? +entries.entries_count : 0;
  }

  async getTotalEntriesForProgressiveRaffle(raffle_id) {
    const raffles = await this.raffleRepository.model.findAll({
      where: {
        progressive_draw_id: raffle_id
      }
    });
    
    let count = 0;
    for( let i = 0; i < raffles.length; i++ ) {
      count += await this.getTotalEntriesForRaffle(raffles[i].id);
    }

    return count;
  }

  async addRaffle(newRaffle) {
    if(newRaffle.id) {
      const raffleExists = await this.raffleRepository.findByPk(newRaffle.id);

      Object.assign(raffleExists, newRaffle);

      raffleExists.save();
      return raffleExists.getPublic();
    }

    let lotteryResult;
    try{
      lotteryResult = await this.peerplaysRepository.createLottery(newRaffle.raffle_name, newRaffle.raffle_description, newRaffle.draw_datetime);
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

    try{
      await this.peerplaysRepository.purchaseTicket(bundle.raffle.peerplays_draw_id, bundle.quantity, player);
    }catch(e) {
      console.error(e);
      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    const normalLotteries = await this.peerplaysRepository.getUserLotteries(player.peerplays_account_id);

    try{
      await this.transferFromPlayerToEscrow(bundle.price, bundle.raffle_id, player.peerplays_account_id, player.peerplays_account_name, player.peerplays_master_password);
    } catch(e) {
      console.error(e);
      if (e.message.includes('insufficient')) {
        throw new Error(this.errors.INSUFFICIENT_BALANCE);
      }

      throw e;
    }

    let progressiveRaffle;

    if(bundle.raffle.progressive_draw_id) {
      progressiveRaffle = await this.raffleRepository.findByPk(bundle.raffle.progressive_draw_id);

      try{
        await this.peerplaysRepository.purchaseTicket(progressiveRaffle.peerplays_draw_id, bundle.quantity, player);
      }catch(e) {
        console.error(e);
        if (e.message.includes('insufficient')) {
          throw new Error(this.errors.INSUFFICIENT_BALANCE);
        }

        throw e;
      }
    }

    const progressiveLotteries = await this.peerplaysRepository.getUserLotteries(player.peerplays_account_id);
    const normalBlockchainEntries = normalLotteries.filter((lottery) => lottery.op[1].lottery === bundle.raffle.peerplays_draw_id).sort((a,b) => Number(b.id.split('.')[2]) - Number(a.id.split('.')[2]));
    const progressiveBlockchainEntries = progressiveLotteries.filter((lottery) => lottery.op[1].lottery === progressiveRaffle.peerplays_draw_id).sort((a,b) => Number(b.id.split('.')[2]) - Number(a.id.split('.')[2]));

    let Entries = [];

    for(let i = 0; i < bundle.quantity; i++) {
      let entry = await this.entryRepository.model.create({
        ticket_sales_id: Sale[0].id,
        peerplays_raffle_ticket_id: normalBlockchainEntries[i].id,
        peerplays_progressive_ticket_id: progressiveBlockchainEntries[i].id
      });
      Entries.push(entry);
    }

    if(player.is_email_allowed && progressiveRaffle) {
      const organization = await this.organizationRepository.findByPk(bundle.raffle.organization_id);
      await this.mailService.sendTicketPurchaseConfirmation(player.firstname, player.email, Entries, bundle.raffle.raffle_name, bundle.raffle_id, progressiveRaffle.draw_datetime, organization.name);
    }

    const beneficiary = await this.beneficiaryRepository.findByPk(Sale[0].beneficiary_id, {
      include: [{
        model: this.organizationRepository.model,
        as: 'user'
      }]
    });

    const amounts = await this.calculateAmounts(bundle.raffle);

    return {
      entries: this.getEntriesArray(Entries),
      ticket_sales: {
        ...Sale[0].get({plain: true}),
        player: player.getPublic(),
        ticket_bundle: bundle.getPublic(),
        beneficiary: {
          ...beneficiary.get({plain: true}),
          user: beneficiary.user.getPublic()
        },
        ...amounts
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

  async createRaffleReport(raffleId, user) {
    const filename = `files/${randomBytes(16).toString('hex')}.csv`;
    const {stream, promise: uploadPromise} = this.fileService.createUploadStream(filename);

    if (!raffleId) {
      await this._createRaffleReport(raffleId, user.organization_id, stream);
    } else {
      const raffle = await this.raffleRepository.findByPk(raffleId);
      if (!raffle) {
        throw new Error(this.errors.NOT_FOUND);
      }

      await this._createRaffleReport(raffleId, user.organization_id, stream);
    }

    stream.end();
    await uploadPromise;

    return `${CDN_URL}/${filename}`;
  }

  async _createRaffleReport(raffle_id, organizationId, stream) {
    const organization = await this.organizationRepository.findByPk(organizationId);
    if (!organization) {
      throw new Error(this.errors.NOT_FOUND);
    }

    const csvParser = new json2csv.Parser({
      fields: [
        {label: 'Organization', value: 'organization'},
        {label: 'Non Profit ID', value: 'non_profit_id'},
        {label: 'Raffle ID', value: 'raffle_id'},
        {label: 'Raffle Type', value: 'raffle_type'},
        {label: 'Draw Date', value: 'draw_date'},
        {label: 'Draw Location', value: 'draw_location'},
        {label: 'Ticket Value', value: 'ticket_value'},
        {label: 'Ticket ID', value: 'ticket_id'},
        {label: 'Entry ID', value: 'entry_ids'},
        {label: 'Player ID', value: 'player_id'},
        {label: 'Player Name', value: 'player_name'},
        {label: 'Player Mobile', value: 'player_mobile'},
        {label: 'Player Email', value: 'player_email'}
      ]
    });

    const fetchCount = 100;
    let currentId = 0;

    while (true) {
      const whereClause = raffle_id ? {
        id: {
          [Op.gt]: currentId
        },
        raffle_id
      }
      : {
        id: {
          [Op.gt]: currentId
        }
      }

      let sales = await this.saleRepository.model.findAll({
        where: whereClause,
        include: [{
          model: this.userRepository.model,
          as: 'player'
        },{
          model: this.raffleRepository.model
        }],
        limit: fetchCount
      });

      if (sales.length === 0) {
        break;
      }

      currentId = sales[sales.length - 1].id;

      sales = sales.map(sale => sale.get({plain: true}));

      sales = await Promise.all(sales.map(async (sale) => {
        sale.entries = await this.entryRepository.model.findAll({
          where: {
            ticket_sales_id: sale.id
          }
        });

        return sale;
      }));
      
      sales = sales.map(sale => ({
        organization: organization.name,
        non_profit_id: organization.non_profit_id,
        raffle_id: `R${padZeros(sale.raffle_id, 2)}`,
        raffle_type: sale.raffle.draw_type,
        draw_date: new Date(sale.raffle.draw_datetime).toLocaleDateString(),
        draw_location: `${organization.city}, ${organization.state}`,
        ticket_value: `$${sale.total_price.toFixed(2)}`,
        ticket_id: `R${padZeros(sale.raffle_id, 2)}T${padZeros(sale.id, 4)}`,
        entry_ids: sale.entries.map(entry => `R${padZeros(sale.raffle_id, 2)}T${padZeros(sale.id, 4)}E${padZeros(entry.id, 5)}`).join(','),
        player_id: sale.player.id,
        player_name: `${sale.player.firstname} ${sale.player.lastname}`,
        player_mobile: sale.player.mobile,
        player_email: sale.player.email
      }));

      const csvData = csvParser.parse(sales);
      stream.write(csvData);
    }
  }

  async resolveRaffles() {
    const pendingRaffles = await this.raffleRepository.findPendingRaffles();
    const winners = await this.peerplaysRepository.getWinners();

    for(let i = 0; i < pendingRaffles.length; i++) {
      const winner = winners.find((winner) => winner.op[1].lottery === pendingRaffles[i].peerplays_draw_id);

      if(!winner) continue;

      const user = await this.userRepository.findByPeerplaysID(winner.op[1].winner);
      if(user) {
        pendingRaffles[i].winner_id = user.id;

        let amounts = await this.calculateAmounts(pendingRaffles[i]);
        //We know the winner from the blockchain but the winning entry is not provided by the blockchain.
        //So, create an array of entries of tickets purchased by the winner and choose the winning entry using Math.Random()
        let whereUserTickets = {
          where: {
            raffle_id: pendingRaffles[i].id,
            player_id: user.id,
            payment_status: saleConstants.paymentStatus.success
          }
        };

        if(pendingRaffles[i].draw_type == raffleConstants.drawType.progressive) {
          const rafflesForProgressive = await this.raffleRepository.model.findAll({
            where: {
              progressive_draw_id: pendingRaffles[i].id
            }
          });
          let raffleIdArr = [{
            raffle_id: pendingRaffles[i].id
          }];
          rafflesForProgressive.map((raffle) => raffleIdArr.push({raffle_id: raffle.id}));
          whereUserTickets = {
            where: {
              [Op.or]: raffleIdArr,
              player_id: user.id,
              payment_status: saleConstants.paymentStatus.success
            }
          };
          amounts = await this.calculateProgressiveAmounts(pendingRaffles[i].id);
        }

        const userTickets = await this.saleRepository.model.findAll(whereUserTickets);
        let userEntries = [];

        for(let j = 0; j < userTickets.length; j++) {
          const entries = await this.entryRepository.findAll({
            where: {
              ticket_sales_id: userTickets[j].id
            }
          });

          userEntries.push(...entries);
        }

        if(userEntries.length === 0) {
          continue;
        }

        if(winner.op[1].hasOwnProperty('winner_ticket_id') && winner.op[1].winner_ticket_id[1] !== 0) {
          let winningWhereClause = {
            where: {
              peerplays_raffle_ticket_id: `1.11.${winner.op[1].winner_ticket_id[1]}`
            }
          };

          if(pendingRaffles[i].draw_type === raffleConstants.drawType.progressive) {
            winningWhereClause = {
              where: {
                peerplays_progressive_ticket_id: `1.11.${winner.op[1].winner_ticket_id[1]}`
              }
            };
          }

          const winning_entry = await this.entryRepository.findAll(winningWhereClause);
          if(winning_entry.length > 0) {
            pendingRaffles[i].winning_entry_id = winning_entry[0].id;
          }else {
            const winningTicketPosition = Math.floor(Math.random() * (userEntries.length - 1) + 1);
            pendingRaffles[i].winning_entry_id = userEntries[winningTicketPosition].id;
          }
        }else {
          const winningTicketPosition = Math.floor(Math.random() * (userEntries.length - 1) + 1);
          pendingRaffles[i].winning_entry_id = userEntries[winningTicketPosition].id;
        }

        await pendingRaffles[i].save();

        await this.distributeWinnerAmount(user.peerplays_account_id, user.peerplays_account_name, user.peerplays_master_password, amounts.total_jackpot, pendingRaffles[i].id);

        if(user.is_email_allowed) {
          const progressiveRaffle = await this.raffleRepository.findByPk(pendingRaffles[i].draw_type === raffleConstants.drawType.progressive ? pendingRaffles[i].id : pendingRaffles[i].progressive_draw_id);
          const org = await this.organizationRepository.findByPk(pendingRaffles[i].organization_id);
          await this.mailService.sendWinnerMail(user.firstname, user.email, pendingRaffles[i].raffle_name, amounts.total_jackpot, progressiveRaffle.draw_datetime, org.name);
        }

        if(pendingRaffles[i].draw_type !== raffleConstants.drawType.progressive) {
          await this.distributeBeneficiaryAndAdminAmount(amounts, pendingRaffles[i].organization_id, pendingRaffles[i].id);
        }
      }
    }

    return true;
  }

  async calculateProgressiveAmounts(raffle_id) {
    let totalProgressiveJackpot = 0;
    const rafflesInProgressive = await this.raffleRepository.model.findAll({
      where: {
        progressive_draw_id: raffle_id
      }
    });

    for(let i = 0; i < rafflesInProgressive.length; i++) {
      totalProgressiveJackpot += (await this.saleRepository.findTotalSuccessSalesForRaffle(rafflesInProgressive[i].id) * rafflesInProgressive[i].progressive_draw_percent / 100);
    }

    return {
      total_jackpot: totalProgressiveJackpot.toFixed(2),
      total_progressive_jackpot: totalProgressiveJackpot.toFixed(2),
      each_beneficiary_amount: 0,
      organization_amount: 0,
      admin_fee_amount: 0,
      donation_amount: 0
    };
  }

  async distributeWinnerAmount(winnerPeerplaysId, winnerPeerplaysName, winnerPeerplaysPassword, amount, raffleId) {
    if(amount <= 0) {
      return;
    }

    const result = await this.peerplaysRepository.sendUSDFromReceiverAccount(winnerPeerplaysId, amount);

    await this.transactionRepository.model.create({
      transfer_from: result.trx.operations[0][1].from,
      transfer_to: result.trx.operations[0][1].to,
      raffle_id: raffleId,
      peerplays_block_num: result.block_num,
      peerplays_transaction_ref: result.trx_num,
      amount,
      transaction_type: transactionConstants.transactionType.winnings
    });

    const keys = Login.generateKeys(
      winnerPeerplaysName,
      winnerPeerplaysPassword,
      ['active'],
      IS_PRODUCTION ? 'PPY' : 'TEST'
    );
    await this.peerplaysRepository.sendUSDFromWinnerToPaymentAccount(winnerPeerplaysId, keys.privKeys.active, amount);
  }

  async distributeBeneficiaryAndAdminAmount(amounts, organization_id, raffleId) {
    const numBeneficiaries = await this.beneficiaryRepository.model.count({where: {
      organization_id
    }});

    const amount = +amounts.admin_fee_amount + +amounts.donation_amount + +amounts.organization_amount + +amounts.each_beneficiary_amount * +numBeneficiaries;
    if(amount <= 0) {
      return;
    }

    const result = await this.peerplaysRepository.sendUSDFromReceiverToPaymentAccount(amount);
    await this.transactionRepository.model.create({
      transfer_from: result.trx.operations[0][1].from,
      transfer_to: result.trx.operations[0][1].to,
      raffle_id: raffleId,
      peerplays_block_num: result.block_num,
      peerplays_transaction_ref: result.trx_num,
      amount,
      transaction_type: transactionConstants.transactionType.donations
    });
  }
}
