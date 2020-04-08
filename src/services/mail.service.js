const fs = require('fs-extra');
const Handlebars = require('handlebars');
const config = require('config');
const moment = require('moment');

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
    const contact = 'mailto:raffles@seacoastmarines.org';
    const contactEmail = 'raffles@seacoastmarines.org';
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';
    const resultHtml = templateHTML({firstname, contact, contactEmail, terms});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: 'Welcome to New Hampshire Marine Corps Lottery',
      html: resultHtml
    };
    await this.smtpConnection.sendMail(options);
  }

  async sendWinnerMail(firstname, email, raffleName, amount, progressiveDrawDate) {
    const sourceHTML = fs.readFileSync(`${__dirname}/templates/winner.handlebars`).toString();
    const templateHTML = Handlebars.compile(sourceHTML);
    const contact = 'mailto:raffles@seacoastmarines.org';
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';
    const progressiveDate = moment(progressiveDrawDate).local().format('MMMM Do [at] hh:mm a');
    const frontendUrl = config.frontendUrl;
    const resultHtml = templateHTML({firstname, amount, contact, raffleName, frontendUrl, terms});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: 'Congratulations, You Won!',
      html: resultHtml
    };
    await this.smtpConnection.sendMail(options);
  }

  async sendTicketPurchaseConfirmation(firstname, email, entries, raffleName, raffleId, progressiveDrawDate) {
    const sourceHTML = fs.readFileSync(`${__dirname}/templates/ticket.handlebars`).toString();
    const templateHTML = Handlebars.compile(sourceHTML);
    const contact = 'mailto:raffles@seacoastmarines.org';
    const contactEmail = 'raffles@seacoastmarines.org';
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';
    let entriesArr = [];
    entries.forEach((entry) => entriesArr.push({
      id: this.addLeadingZeros(entry.id, 5),
      ticketId: this.addLeadingZeros(entry.ticket_sales_id, 4),
      raffleId: this.addLeadingZeros(raffleId, 2)
    }));
    const progressiveDate = moment(progressiveDrawDate).local().format('MMMM Do, YYYY [at] hh:mm a');
    const resultHtml = templateHTML({firstname, entriesArr, raffleName, raffleId, contact, contactEmail, terms});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: `Your tickets for ${raffleName}`,
      html: resultHtml
    };
    await this.smtpConnection.sendMail(options);
  }

  addLeadingZeros(num, totalDigitsRequired) {
    var str = num+"";
    while (str.length < totalDigitsRequired) str = "0" + str;
    return str;
}

}

module.exports = MailService;
