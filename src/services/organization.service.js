
import OrganizationRepository from '../repositories/organization.repository';
import {organizationType} from '../constants/organization';
import path from 'path';
import config from 'config';
import FileService from './file.service';

export default class OrganizationService {
  
  constructor(conns) {
    this.repository = new OrganizationRepository();
    this.fileService = new FileService(conns);

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

  async deleteLogoFromCDN(org) {
    if (org.logo_url && org.logo_url.startsWith(config.cdnUrl)) {
      await this.fileService.delete('pics/' + path.basename(org.logo_url));
    }
  }

  async setLogoUrl(id, logoUrl) {
    const org = await this.repository.findByPk(id);

    if (!org) {
      throw new Error(this.errors.NOT_FOUND);
    }

    await this.deleteLogoFromCDN(org);

    org.logo_url = logoUrl;
    await org.save();
    return org.getPublic();
  }

}
