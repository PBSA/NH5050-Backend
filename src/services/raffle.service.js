const RaffleRepository = require('../repositories/raffle.repository');
const BundleRepository = require('../repositories/bundle.repository');
const UserRepository = require('../repositories/user.repository');
const PeerplaysRepository = require('../repositories/peerplays.repository');
const ValidateError = require('../errors/validate.error');
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
      peerplays_draw_id: lotteryResult.id
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
        console.log('PaymentIntent was successful!')
        //TODO: purchase tickets on blockchain, if not already purchased for this payemnt_intent and send email
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
}
