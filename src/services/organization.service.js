
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

}

module.exports = OrganizationService;
