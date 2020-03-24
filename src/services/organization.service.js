
import OrganizationRepository from '../repositories/organization.repository';

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
    const organization = await this.repository.model.upsert({
      ...organizationData
    })

    return organization.getPublic();
  }

}

module.exports = OrganizationService;
