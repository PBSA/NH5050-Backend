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
      logger.trace('serialized transaction:', JSON.stringify(tr.serialize(), null, 2));
      [result] = await tr.broadcast();
      result.amount = amount;
    } catch (e) {
      logger.error(e.message);
      throw e;
    }

    return result;
  }

  async getAccountId(name) {
    let account;

    try {
      account = await this.peerplaysConnection.dbAPI.exec('get_account_by_name', [name]);
    } catch (e) {
      logger.warn('Peerplays returns error', e.message);
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
}

module.exports = PeerplaysRepository;