const fs = require('fs-extra');
const Handlebars = require('handlebars');
const config = require('config');

class MailService {

  /**
   * @param {Object} conns
   * @param {SmtpConnection} conns.smtpConnection
   */
  constructor(conns) {
    this.smtpConnection = conns.smtpConnection;
  }

  async sendMailAfterRegistration(firstname, email) {
    const sourceHTML = fs.readFileSync(`${__dirname}/templates/welcome.handlebars`).toString();
    const templateHTML = Handlebars.compile(sourceHTML);
    const contact = 'mailto:support@nh5050.com';
    const terms = `${config.frontendUrl}/terms`;
    const resultHtml = templateHTML({firstname, contact, terms});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: 'Welcome to New Hampshire Marine Corps Lottery',
      html: resultHtml
    };
    await this.smtpConnection.sendMail(options);
  }

  async sendWinnerMail(firstname, email, raffleId, raffleName) {
    const sourceHTML = fs.readFileSync(`${__dirname}/templates/winner.handlebars`).toString();
    const templateHTML = Handlebars.compile(sourceHTML);
    const contact = 'mailto:support@nh5050.com';
    const terms = `${config.frontendUrl}/terms`;
    const url = `${config.frontendUrl}/raffle/${raffleId}`;
    const resultHtml = templateHTML({firstname, url, contact, terms, raffleName});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: 'Congratulations, You Won!',
      html: resultHtml
    };
    await this.smtpConnection.sendMail(options);
  }

}

module.exports = MailService;
