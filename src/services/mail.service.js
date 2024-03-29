const fs = require('fs-extra');
const Handlebars = require('handlebars');
const config = require('config');

let templates = ['welcome', 'winner', 'participant', 'ticket', 'report'];

templates = templates.map(name => {
  const template = fs.readFileSync(`${__dirname}/templates/${name}.handlebars`).toString('utf-8');
  return [name, Handlebars.compile(template)];
});

templates = Object.fromEntries(templates);

function renderTemplate(name, args) {
  if (!templates[name]) {
    throw new Error(`invalid template name ${name}`);
  }

  return templates[name](args);
}

class MailService {

  /**
   * @param {Object} conns
   * @param {SmtpConnection} conns.smtpConnection
   */
  constructor(conns) {
    this.smtpConnection = conns.smtpConnection;
  }

  async sendMailAfterRegistration(firstname, email) {
    const contact = 'mailto:raffles@seacoastmarines.org';
    const contactEmail = 'raffles@seacoastmarines.org';
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';
    const resultHtml = renderTemplate('welcome', {firstname, contact, contactEmail, terms});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: 'Welcome to New Hampshire Marine Corps Lottery',
      html: resultHtml
    };
    await this.smtpConnection.sendMail(options);
  }

  async sendWinnerMail(firstname, email, raffleName, amount, organizationName) {
    const contact = 'mailto:raffles@seacoastmarines.org';
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';
    const frontendUrl = config.frontendUrl;
    const resultHtml = renderTemplate('winner', {firstname, amount, contact, raffleName, frontendUrl, terms, organizationName});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: 'Congratulations, You Won!',
      html: resultHtml
    };
    
    await this.smtpConnection.sendMail(options);
  }

  async sendParticipantEmail(emails, winnerName, raffleName) {
    const frontendUrl = config.frontendUrl;
    const resultHtml = renderTemplate('participant', {raffleName, winnerName, frontendUrl});

    const options = {
      bcc: emails.join(','),
      from: config.mailer.sender,
      subject: 'Thank you for supporting the MCL NH Raffle',
      html: resultHtml
    };

    await this.smtpConnection.sendMail(options);
  }

  async sendTicketPurchaseConfirmation(firstname, email, entries, raffleAmount, raffleName, raffleId, organizationName) {
    const contact = 'mailto:raffles@seacoastmarines.org';
    const contactEmail = 'raffles@seacoastmarines.org';
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';
    const joinToday = 'https://www.seacoastmarines.org/mcl-nh/';
    const rules = 'https://www.seacoastmarines.org/raffle-rules/';
    
    let entriesArr = entries.map((entry) => ({
      id: this.addLeadingZeros(entry.id, 5),
      ticketId: this.addLeadingZeros(entry.ticket_sales_id, 4),
      raffleId: this.addLeadingZeros(raffleId, 2)
    }))

    const resultHtml = renderTemplate('ticket', {firstname, entriesArr, raffleAmount, raffleName, raffleId, contact, contactEmail, terms, organizationName, joinToday, rules});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: `Your tickets for NH MCL ${raffleName}`,
      html: resultHtml
    };
    
    await this.smtpConnection.sendMail(options);
  }

  async sendRaffleReportToAdmin(adminName, email, raffleAmount, raffleName, winnerName, reportUrl) {
    const terms = 'https://www.seacoastmarines.org/raffle-rules/terms-conditions/';

    const resultHtml = renderTemplate('report', {adminName, winnerName, raffleAmount, raffleName, terms, reportUrl});

    const options = {
      to: email,
      from: config.mailer.sender,
      subject: `Report for NH MCL ${raffleName}`,
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
