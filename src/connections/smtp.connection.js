/* istanbul ignore file */
const nodemailer = require('nodemailer');
const BaseConnection = require('./abstracts/base.connection');
const config = require('config');

class SmtpConnection extends BaseConnection {
  connect() {
    this.transporter = nodemailer.createTransport(config.mailer);
  }

  async sendMail(options) {
    await this.transporter.sendMail(options);
    return true;
  }

  disconnect() {
  }

}

module.exports = SmtpConnection;
