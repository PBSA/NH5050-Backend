/* istanbul ignore file */
import request from 'request';
import config from 'config';
import { Apis, ConnectionManager, TransactionBuilder } from 'peerplaysjs-lib';

import BaseConnection from './abstracts/base.connection';

const HEALTHCHECK_INTERVAL = 1000 * 10;
const MAX_RETRY_TIMEOUT = 1000 * 60;

function getRetryTimeout(attempt) {
  return Math.min(Math.pow(2.0, attempt + 1.0), MAX_RETRY_TIMEOUT) * 1000.0;
}

class PeerplaysConnection extends BaseConnection {
  constructor() {
    super();

    this.dbAPI = null;
    this.asset = null;
    this.apiInstance = null;
    this.reconnectAttempt = 0;

    const urls = config.peerplays.peerplaysWS.split(',');
    this.wsConnectionManager = new ConnectionManager({urls});
  }
  
  doHealthcheck() {
    this.dbAPI.exec('get_global_properties', [])
      .then(() => {
        setTimeout(() => this.doHealthcheck(), HEALTHCHECK_INTERVAL);
      })
      .catch(() => this.connect());
  }

  async connect() {
    this.endpoints = await this.wsConnectionManager.sortNodesByLatency();

    if (!this.endpoints || this.endpoints.length === 0) {
      throw new Error('no valid peerplays urls');
    }

    const endpoint = this.endpoints[this.reconnectAttempt % this.endpoints.length];
    console.info(`connecting to peerplays endpoint "${endpoint}"`);
    const apiInstance = Apis.instance(endpoint, true);

    try {
      await apiInstance.init_promise;
    } catch (err) {
      const timeout = getRetryTimeout(this.reconnectAttempt++);
      console.info(`peerplays connection failed, reason: ${err.message}, retrying in ${timeout / 1000.0} seconds`);
      setTimeout(() => this.connect(), timeout);
      return;
    }

    this.reconnectAttempt = 0;

    this.apiInstance = apiInstance;
    this.dbAPI = this.apiInstance.db_api();
    this.networkAPI = this.apiInstance.network_api();
    [this.asset] = await this.dbAPI.exec('get_assets', [[config.peerplays.sendAssetId]]);
    this.TransactionBuilder = TransactionBuilder;
    
    this.doHealthcheck();
    console.info('peerplays connection successful');
  }

  async request(form) {
    const options = {
      method: 'POST',
      uri: config.peerplays.peerplaysFaucetURL,
      json: form
    };

    return new Promise((success, fail) => {
      request(options, (err, res, body) => {

        if (err) {
          fail(err.message);
          return;
        }

        if (res.statusCode !== 200) {
          fail('Peerplays: Unknown error');
          return;
        }

        if (body.error) {
          fail(body.error);
          return;
        }

        if (body.length === 0) {
          success(null);
          return;
        }

        try {
          success(body);
        } catch (_err) {
          fail(_err.message);
        }
      });
    });
  }

  disconnect() {
  }

}

export default PeerplaysConnection;
