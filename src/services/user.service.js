
import {randomBytes} from 'crypto';
import bcrypt from 'bcrypt';
import {Login} from 'peerplaysjs-lib';
import UserRepository from '../repositories/user.repository';
import PeerplaysRepository from '../repositories/peerplays.repository';
import MailService from './mail.service';

const profileConstants = require('../constants/profile');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

class UserService {

  /**
     * @param {peerplaysConnection} conns.peerplaysConnection
     */
  constructor(conns) {
    this.peerplaysConnection = conns.peerplaysConnection;
    this.peerplaysRepository = new PeerplaysRepository(conns);
    this.mailService = new MailService(conns);
    this.userRepository = new UserRepository();

    this.errors = {
      NOT_FOUND: 'NOT_FOUND',
      INVALID_USER_TYPE: 'INVALID_USER_TYPE'
    }
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

  signUp(req, newUser) {
    newUser.user_type = profileConstants.userType.player;
    return this.createUser(newUser, req.connection.remoteAddress);
  }

  async createPeerplaysAccountForUser(user) {
    const peerplaysAccountUsername = `nh-${user.firstname.toLowerCase() + user.mobile.replace('+','')}`;
    const peerplaysAccountPassword = randomBytes(32).toString('hex');

    const keys = Login.generateKeys(
      peerplaysAccountUsername,
      peerplaysAccountPassword,
      ['owner', 'active'],
      IS_PRODUCTION ? 'PPY' : 'TEST'
    );

    const ownerKey = keys.pubKeys.owner;
    const activeKey = keys.pubKeys.active;

    await this.peerplaysRepository.createPeerplaysAccount(peerplaysAccountUsername, ownerKey, activeKey);

    user.peerplays_account_name = peerplaysAccountUsername;
    user.peerplays_account_id = await this.peerplaysRepository.getAccountId(peerplaysAccountUsername);
    user.peerplays_master_password = peerplaysAccountPassword;

    await user.save();
    return user;
  }

  createOrUpdateUser(userData) {
    if (userData.hasOwnProperty('id')) {
      return this.updateUser(userData);
    }

    return this.createUser(userData);
  }

  async createUser(newUser, remoteAddress) {
    const {firstname, lastname, password, email, mobile, organization_id} = newUser;

    let hashedPassword;

    if(password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await this.userRepository.model.create({
      email,
      mobile: this.userRepository.normalizePhoneNumber(mobile),
      password: hashedPassword,
      firstname,
      lastname,
      is_email_verified: false,
      is_email_allowed: newUser.is_email_allowed,
      user_type: newUser.user_type,
      status: profileConstants.status.active,
      ip_address: remoteAddress,
      organization_id: organization_id
    });

    await this.createPeerplaysAccountForUser(user);

    if (newUser.is_email_allowed) {
      await this.mailService.sendMailAfterRegistration(firstname, email);
    }

    return this.getCleanUser(user);
  }

  async updateUser(updatedUser) {
    const user = await this.userRepository.findByPk(updatedUser.id);
    if (!user) {
      throw new Error(this.errors.NOT_FOUND);
    }

    if (user.user_type !== updatedUser.user_type) {
      throw new Error(this.errors.INVALID_USER_TYPE);
    }

    user.email = updatedUser.email;
    user.mobile = this.userRepository.normalizePhoneNumber(updatedUser.mobile);

    if (updatedUser.password) {
      user.password = await bcrypt.hash(updatedUser.password, 10);
    }

    user.firstname = updatedUser.firstname;
    user.lastname = updatedUser.lastname;

    if (updatedUser.email !== user.email) {
      user.email = updatedUser.email;
      user.is_email_verified = false;
    }

    user.is_email_allowed = updatedUser.is_email_allowed;
    await user.save();

    return this.getCleanUser(user);
  }

  async getSignInUser(email, password) {
    const User = await this.userRepository.findByEmail(email.toLowerCase());

    if (!User) {
      throw new Error('User not found');
    }

    if (!await bcrypt.compare(password, User.password)) {
      throw new Error('Invalid password');
    }

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
