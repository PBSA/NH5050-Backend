const {PrivateKey, Login} = require('peerplaysjs-lib');
const BigNumber = require('bignumber.js');
const config = require('config');
BigNumber.config({ROUNDING_MODE: BigNumber.ROUND_FLOOR});

const PeerplaysNameExistsError = require('../errors/peerplays-name-exists.error');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class PeerplaysRepository {

  /**
   * @param {PeerplaysConnection} opts.peerplaysConnection
   */
  constructor(opts) {
    this.peerplaysConnection = opts.peerplaysConnection;

    this.pKey = PrivateKey.fromWif(config.peerplays.paymentAccountWIF);
    this.receiverPKey = PrivateKey.fromWif(config.peerplays.paymentReceiverWIF);
  }

  async createPeerplaysAccount(name, ownerKey, activeKey) {
    try {
      const {account} = await this.peerplaysConnection.request({
        account: {
          name,
          active_key: activeKey,
          memo_key: activeKey,
          owner_key: ownerKey,
          refcode: '',
          referrer: config.peerplays.referrer
        }
      });

      return {name, ...account};
    } catch (err) {
      if (err.base && err.base[0]) {
        if (err.base[0] === 'Account exists') {
          throw new PeerplaysNameExistsError(`an account with name "${name}" already exists`);
        }
      }

      throw err;
    }
  }

  async sendPPY(accountId, amount, senderAccountId, senderPKey) {
    amount = new BigNumber(amount).shiftedBy(this.peerplaysConnection.asset.precision).toNumber();
    const tr = new this.peerplaysConnection.TransactionBuilder();
    let result;

    try {
      tr.add_type_operation('transfer', {
        fee: {
          amount: 0,
          asset_id: config.peerplays.sendAssetId
        },
        from: senderAccountId,
        to: accountId,
        amount: {amount, asset_id: config.peerplays.sendAssetId}
      });


      await tr.set_required_fees();
      tr.add_signer(senderPKey, senderPKey.toPublicKey().toPublicKeyString());
      console.trace('serialized transaction:', JSON.stringify(tr.serialize(), null, 2));
      [result] = await tr.broadcast();
      result.amount = amount;
    } catch (e) {
      console.error(e.message);
      throw e;
    }

    return result;
  }

  async getAccountId(name) {
    let account;

    try {
      account = await this.peerplaysConnection.dbAPI.exec('get_account_by_name', [name]);
    } catch (e) {
      console.warn('Peerplays returns error', e.message);
      throw new Error('Fetch account error');
    }

    if(account) {
      return account.id;
    } else {
      return null;
    }
  }

  async broadcastSerializedTx(tr) {
    return new Promise((success, fail) => {
      this.peerplaysConnection.networkAPI
        .exec('broadcast_transaction_with_callback', [(res) => success(res), tr])
        .catch((error) => fail(error));
    });
  }

  async getPeerplaysUser(login, password) {
    const keys = Login.generateKeys(login, password,
      ['active'],
      IS_PRODUCTION ? 'PPY' : 'TEST');
    const publicKey = keys.pubKeys.active;
    const fullAccounts = await this.peerplaysConnection.dbAPI.exec('get_full_accounts',[[login],false]);

    if (fullAccounts) {
      return fullAccounts.find((fullAccount) => {
        return fullAccount[1].account.active.key_auths.find((key_auth)=> { 
          return key_auth[0] === publicKey;
        });
      });
    }

    return null;
  }
  
  async sendPPYFromPaymentAccount(accountId, amount) {
    return this.sendPPY(accountId, amount, config.peerplays.paymentAccountID, this.pKey);
  }

  async sendPPYFromReceiverAccount(accountId, amount) {
    return this.sendPPY(accountId, amount, config.peerplays.paymentReceiver, this.receiverPKey);
  }

  randomizeLottoName() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let i = 0; i < 16; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }

    return text;
}

  async createLottery(userPeerplaysId, name, description, drawDate, userPKey) {
    const tr = new this.peerplaysConnection.TransactionBuilder();
    let result;

    try {
      tr.add_type_operation('lottery_asset_create', {
        issuer: userPeerplaysId,
        symbol: this.randomizeLottoName(),
        precision: 0,
        extensions: {
          benefactors: [{
            id: userPeerplaysId,
            share: new BigNumber(50).shiftedBy(2).toNumber()
          }],
          owner: config.peerplays.ticketAssetID,
          winning_tickets: [new BigNumber(50).shiftedBy(2).toNumber()],
          ticket_price: {
              amount: new BigNumber(config.peerplays.ticketPrice).toNumber(),
              asset_id: config.peerplays.ticketAssetID
          },
          end_date: Math.floor(new Number(drawDate)/1000), // milliseconds to seconds
          ending_on_soldout: false,
          is_active: true
        },
        common_options: {
          max_supply: Number(config.peerplays.maxTicketSupply),
          market_fee_percent: 0,
          max_market_fee: 1000000000000000,
          issuer_permissions: 79,
          flags: 0,
          core_exchange_rate: {
              base: {
                  amount: 1,
                  asset_id: '1.3.0'
              },
              quote: {
                  amount: 1,
                  asset_id: '1.3.1'
              }
          },
          whitelist_authorities: [],
          blacklist_authorities: [],
          whitelist_markets: [],
          blacklist_markets: [],
          description: JSON.stringify({
            lottoName: name.substring(0,40),
            description: description.substring(0,100),
            drawType: 1
            }),
          extensions: []
        },
        is_prediction_market: false
      });


      await tr.set_required_fees();
      tr.add_signer(userPKey, userPKey.toPublicKey().toPublicKeyString());
      console.trace('serialized transaction:', JSON.stringify(tr.serialize()));
      [result] = await tr.broadcast();
    } catch (e) {
      console.error(e.message);
      throw e;
    }

    return result;
  }
}

module.exports = PeerplaysRepository;
