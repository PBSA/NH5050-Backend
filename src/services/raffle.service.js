const RaffleRepository = require('../repositories/raffle.repository');
const UserRepository = require('../repositories/user.repository');
const PeerplaysRepository = require('../repositories/peerplays.repository');
const {Login} = require('peerplaysjs-lib');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class RaffleService {
  constructor(conns) {
    this.raffleRepository = new RaffleRepository();
    this.userRepository = new UserRepository();
    this.peerplaysRepository = new PeerplaysRepository(conns);

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
}

module.exports = RaffleService;