
import OrganizationRepository from '../repositories/organization.repository';
import BeneficiaryRepository from '../repositories/beneficiary.repository';
import {organizationType} from '../constants/organization';
import path from 'path';
import config from 'config';
import FileService from './file.service';
import {sequelize} from '../db/index';

export default class OrganizationService {
  
  constructor(conns) {
    this.organizationRepository = new OrganizationRepository();
    this.beneficiaryRepository = new BeneficiaryRepository();
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

    return org.getPublic();
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
    },{ returning: true });

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

    return beneficiaries.map(beneficiary => {
      return {
        ...beneficiary.get({plain: true}),
        user: beneficiary.user.getPublic()
      };
    });
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

}
