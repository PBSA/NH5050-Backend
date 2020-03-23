
const bcrypt = require('bcrypt');
const {Login} = require('peerplaysjs-lib');
const userRepository = require('../repositories/user.repository');
const peerplaysRepository = require('../repositories/peerplays.repository');
const mailService = require('./mail.service');
const profileConstants = require('../constants/profile');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class UserService {

  /**
     * @param {peerplaysConnection} conns.peerplaysConnection
     */
  constructor(conns) {
    this.peerplaysRepository = new peerplaysRepository(conns);
    this.peerplaysConnection = conns.peerplaysConnection;
    this.mailService = new mailService(conns);
    this.userRepository = new userRepository();
  }

  /**
     * @param {UserModel} User
     * @returns {Promise<UserPublicObject>}
     */
  async getCleanUser(User) {
    return User.getPublic();
  }

  async getUser(id) {
    const User = await this.userRepository.findByPk(id);

    if (!User) {
      throw new Error('User not found');
    }

    return this.getCleanUser(User);
  }

  async signUp(req, newUser) {
    const {firstname, lastname, password, email} = newUser;
    let {mobile} = newUser;
    mobile = this.userRepository.normalizePhoneNumber(mobile);
    const unhashedPassword = password ? password : firstname + lastname + email + mobile;
    const peerplaysAccountUsername = `nh-${firstname.toLowerCase() + mobile.replace('+','')}`;
    const peerplaysAccountPassword = await bcrypt.hash(`nh-${unhashedPassword}${(new Date()).getTime()}`, 10);
    const keys = Login.generateKeys(
      peerplaysAccountUsername,
      peerplaysAccountPassword,
      ['owner', 'active'],
      IS_PRODUCTION ? 'PPY' : 'TEST'
    );
    const ownerKey = keys.pubKeys.owner;
    const activeKey = keys.pubKeys.active;

    const User = await this.userRepository.model.create({
      email,
      mobile,
      password,
      firstname,
      lastname,
      is_email_verified: false,
      is_email_allowed: newUser.is_email_allowed,
      user_type: profileConstants.userType.player,
      status: profileConstants.status.active,
      ip_address: req.connection.remoteAddress,
      organization_id: newUser.organization_id
    });

    await this.mailService.sendMailAfterRegistration(firstname, email);

    await this.peerplaysRepository.createPeerplaysAccount(peerplaysAccountUsername,ownerKey, activeKey);
    User.peerplays_account_name = peerplaysAccountUsername;
    User.peerplays_account_id = await this.peerplaysRepository.getAccountId(peerplaysAccountUsername);
    User.peerplays_master_password = peerplaysAccountPassword;
    await User.save();

    return this.getCleanUser(User);
  }

  async searchUsers(email, mobile) {
    const User = await this.userRepository.getByEmailOrMobile(email, mobile);

    if (!User) {
      throw new Error('User not found. Please create a new user.');
    }

    return this.getCleanUser(User);
  }
}

module.exports = UserService;
