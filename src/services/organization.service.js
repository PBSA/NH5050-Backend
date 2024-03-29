
import OrganizationRepository from '../repositories/organization.repository';
import BeneficiaryRepository from '../repositories/beneficiary.repository';
import SalesRepository from '../repositories/sale.repository';
import RaffleRepository from '../repositories/raffle.repository';
import UserRepository from '../repositories/user.repository';
import UserService from '../services/user.service';
import FileService from './file.service';
import {paymentStatus} from '../constants/sale';

import {userType} from '../constants/profile';
import {organizationType} from '../constants/organization';
import path from 'path';
import config from 'config';
import {sequelize} from '../db/index';

export default class OrganizationService {
  
  constructor(conns) {
    this.organizationRepository = new OrganizationRepository();
    this.beneficiaryRepository = new BeneficiaryRepository();
    this.salesRepository = new SalesRepository();
    this.raffleRepository = new RaffleRepository();
    this.userRepository = new UserRepository();
    this.userService = new UserService(conns);
    this.fileService = new FileService(conns);

    this.errors = {
      NOT_FOUND: 'NOT FOUND',
      INVALID_BENEFICIARY: 'INVALID BENEFICIARY',
      OTHER_ORGANIZATION: 'Cannot update another organization',
      SUPER_ADMIN_ONLY: 'Only super admin can create an organization'
    };
  }

  async getOrganization(id) {
    const org = await this.organizationRepository.findByPk(id);

    if (!org) {
      throw new Error(this.errors.NOT_FOUND);
    }

    const totalSales = await this.salesRepository.model.findAll({
      where: {
        '$raffle.organization_id$': id,
        payment_status: paymentStatus.success
      },
      attributes: [
        [sequelize.literal('SUM(total_price * raffle.organization_percent / 100)'), 'total_sum']
      ],
      include: [{
        model: this.raffleRepository.model,
        as: 'raffle',
        attributes: ['organization_id','organization_percent']
      }],
      group: ['raffle.organization_id','raffle.organization_percent'],
      raw: true
    });

    const totalFunds = (Math.ceil(totalSales.reduce((acc, sale) => sale.total_sum + acc, 0.0) * 100)/100).toFixed(2);

    return {
      ...org.getPublic(),
      total_funds: totalFunds
    };
  }

  async createOrUpdateOrganization(user, organizationData) {
    if(organizationData.id && user.organization_id !== organizationData.id) {
      throw new Error(this.errors.OTHER_ORGANIZATION);
    }

    if(!organizationData.id && user.organization_id) {
      throw new Error(this.errors.SUPER_ADMIN_ONLY);
    }

    organizationData.type = organizationType.organization;
    const organization = await this.organizationRepository.model.upsert({
      ...organizationData,
      type: organizationType.organization
    }, {returning: true});

    return organization[0].getPublic();
  }

  async deleteLogoFromCDN(org) {
    if (org.logo_url && org.logo_url.startsWith(config.cdnUrl)) {
      await this.fileService.delete('pics/' + path.basename(org.logo_url));
    }
  }

  async setLogoUrl(id, logoUrl) {
    const org = await this.organizationRepository.findByPk(id);

    if (!org) {
      throw new Error(this.errors.NOT_FOUND);
    }

    await this.deleteLogoFromCDN(org);

    org.logo_url = logoUrl;
    await org.save();
    return org.getPublic();
  }

  async getBeneficiaries(organizationId) {
    const beneficiaries = await this.beneficiaryRepository.model.findAll({
      where: {
        organization_id: organizationId
      },
      include: [{
        model: this.organizationRepository.model,
        as: 'user'
      }]
    });

    return Promise.all(beneficiaries.map(async (beneficiary) => {
      const totalSales = await this.salesRepository.model.findAll({
        where: {
          beneficiary_id: beneficiary.id,
          payment_status: paymentStatus.success
        },
        attributes: [
          [sequelize.literal('SUM(total_price * raffle.beneficiary_percent / 100)'), 'total_sum']
        ],
        include: [{
          model: this.raffleRepository.model,
          as: 'raffle',
          attributes: ['beneficiary_percent']
        }],
        group: ['sales.id','raffle.id'],
        raw: true
      });

      const totalFunds = (Math.ceil(totalSales.reduce((acc, sale) => sale.total_sum + acc, 0.0) * 100)/100).toFixed(2);

      return {
        ...beneficiary.get({plain: true}),
        user: beneficiary.user.getPublic(),
        total_funds: totalFunds
      };
    }));
  }

  createOrUpdateBeneficiary(organizationId, beneficiaryData) {
    if (beneficiaryData.hasOwnProperty('id')) {
      return this.updateBeneficiary(organizationId, beneficiaryData);
    }

    return this.createBeneficiary(organizationId, beneficiaryData);
  }

  async createBeneficiary(organizationId, beneficiaryData) {
    const transaction = await sequelize.transaction();

    try {
      const beneficiary = await this.organizationRepository.model.create({
        ...beneficiaryData,
        type: organizationType.beneficiary
      }, {transaction});

      await this.beneficiaryRepository.model.create({
        user_id: beneficiary.id,
        organization_id: organizationId
      }, {transaction});

      await transaction.commit();
      return beneficiary;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async updateBeneficiary(organizationId, beneficiaryData) {
    const transaction = await sequelize.transaction();

    try {
      const bindingExists = await this.beneficiaryRepository.model.count({
        where: {
          user_id: beneficiaryData.id,
          organization_id: organizationId
        }
      }, {transaction});

      if (bindingExists === 0) {
        throw new Error(this.errors.INVALID_BENEFICIARY);
      }

      await this.organizationRepository.model.update({
        ...beneficiaryData,
        type: organizationType.beneficiary
      }, {
        where: {
          id: beneficiaryData.id
        }
      }, {transaction});

      const beneficiary = (await this.organizationRepository.findByPk(beneficiaryData.id, {transaction})).getPublic();
      await transaction.commit();
      
      return beneficiary;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  async getSellers(organizationId, raffleId) {
    const sellers = await this.userRepository.model.findAll({
      where: {
        organization_id: organizationId,
        user_type: userType.seller
      }
    });

    return Promise.all(sellers.map(async (seller) => {
      const where = {
        seller_id: seller.id,
        payment_status: paymentStatus.success
      };

      if (raffleId) {
        where.raffle_id = raffleId;
      }

      const [{total_funds, sales_count}] = await this.salesRepository.model.findAll({
        where,
        attributes: [
          [sequelize.fn('sum', sequelize.col('total_price')), 'total_funds'],
          [sequelize.fn('count', sequelize.col('id')), 'sales_count']
        ],
        raw: true
      });

      return {
        ...seller.getPublic(),
        total_funds: (total_funds || 0).toFixed(2),
        sales_count: sales_count
      };
    }));
  }

  createOrUpdateSeller(organizationId, sellerData) {
    sellerData.organization_id = organizationId;
    sellerData.user_type = userType.seller;

    return this.userService.createOrUpdateUser(sellerData);
  }

  async getAdmins(organizationId) {
    const admins = await this.userRepository.model.findAll({
      where: {
        organization_id: organizationId,
        user_type: userType.admin
      }
    });

    return admins.map(admin => admin.getPublic());
  }

  async createOrUpdateAdmin(organizationId, adminData) {
    //allow super admin to create admin with any organization
    //allow an organization to create admins for its beneficiaries
    if(organizationId && organizationId !== adminData.organization_id) {
      const beneficiary = await this.beneficiaryRepository.model.findOne({
        where: {
          organization_id: organizationId,
          user_id: adminData.organization_id
        }
      });

      if(!beneficiary) {
        adminData.organization_id = organizationId;
      }
    }
    adminData.user_type = userType.admin;

    return this.userService.createOrUpdateUser(adminData);
  }

  async deleteAdmin(organizationId, userId) {
    const deleted = await this.userRepository.delete({
      where: {
        organization_id: organizationId,
        id: userId
      }
    });

    return deleted !== 0;
  }

  async isBeneficiaryOf(organizationId, beneficiaryId) {
    const binding = await this.beneficiaryRepository.model.findOne({
      where: {
        user_id: beneficiaryId,
        organization_id: organizationId
      }
    });

    return !!binding;
  }

}
