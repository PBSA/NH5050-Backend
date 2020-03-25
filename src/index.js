import server from './server.js';

import PeerplaysConnection from './connections/peerplays.connection';
import SmtpConnection from './connections/smtp.connection';
import AWSConnection from './connections/aws.connection';

var conns = {};

(async () => {

  try {
    conns.peerplaysConnection = new PeerplaysConnection();
    conns.smtpConnection = new SmtpConnection();
    conns.awsConnection = new AWSConnection();

    await conns.peerplaysConnection.connect();
    await conns.smtpConnection.connect();
    await conns.awsConnection.connect();

    await new server(conns).init();
  } catch (err) {
    console.log(err);
  } finally {
    console.log('server has been started');
  }
})();
