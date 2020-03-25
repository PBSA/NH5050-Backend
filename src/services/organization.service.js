
import OrganizationRepository from '../repositories/organization.repository';
import {organizationType} from '../constants/organization';

class OrganizationService {
  
  constructor() {
    this.repository = new OrganizationRepository();

    this.errors = {
      NOT_FOUND: 'NOT_FOUND'
    };
  }

  async getOrganization(id) {
    const org = await this.repository.findByPk(id);

    if (!org) {
      throw new Error(this.errors.NOT_FOUND);
    }

    return org.getPublic();
  }

  async createOrUpdateOrganization(organizationData) {
    organizationData.type = organizationType.organization;
    const organization = await this.repository.model.upsert({
      ...organizationData
    },{ returning: true });

    return organization[0].getPublic();
  }

}

module.exports = OrganizationService;
