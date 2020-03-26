const Joi = require('joi');
const BaseValidator = require('./abstract/base.validator');
const ValidateError = require('../errors/validate.error');
const raffleConstants = require('../constants/raffle');
const organizationConstants = require('../constants/organization');
const organizationRepository = require('../repositories/organization.repository');
const raffleRepository = require('../repositories/raffle.repository');
const moment = require('moment');

class RaffleValidator extends BaseValidator {

  constructor() {
    super();

    this.organizationRepository = new organizationRepository();
    this.raffleRepository = new raffleRepository();

    this.getRaffleById = this.getRaffleById.bind(this);
    this.getRafflesByOrganization = this.getRafflesByOrganization.bind(this);
    this.addRaffle = this.addRaffle.bind(this);
    this.addBundle = this.addBundle.bind(this);
    this.getTicketBundles = this.getTicketBundles.bind(this);
  }

  getRaffleById() {
    const querySchema = {
      raffleId: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, (req, query) => query.raffleId);
  }

  getRafflesByOrganization() {
    const querySchema = {
      organizationId: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, (req, query) => query.organizationId);
  }

  addRaffle() {
    const bodySchema = {
      id: Joi.number().integer(),
      raffle_name: Joi.string().min(5).max(50).required(),
      raffle_description: Joi.string().max(1500).required(),
      slug: Joi.string().required(),
      organization_id: Joi.number().integer().required(),
      start_datetime: Joi.date().min('now').iso().required(),
      end_datetime: Joi.date().iso().required(),
      draw_datetime: Joi.date().iso().required(),
      draw_type: Joi.string().valid(Object.values(raffleConstants.drawType)).required(),
      progressive_draw_id: Joi.number().min(0),
      admin_fees_percent: Joi.number().min(0),
      donation_percent: Joi.number().min(0),
      raffle_draw_percent: Joi.number().min(0),
      progressive_draw_percent: Joi.number().min(0),
      organization_percent: Joi.number().min(0),
      beneficiary_percent: Joi.number().min(0)
    };

    return this.validate(null, bodySchema, async(req, query, body) => {
      const {id, organization_id, draw_type, progressive_draw_id, admin_fees_percent, donation_percent, raffle_draw_percent, progressive_draw_percent, organization_percent, beneficiary_percent} = body;

      if(moment(body.end_datetime).diff(moment(body.start_datetime)) < 0) {
        throw new ValidateError(400, 'Validate error', {
          end_datetime: 'end date should be greater than start date'
        });
      }

      if(moment(body.draw_datetime).diff(moment(body.end_datetime)) < 0) {
        throw new ValidateError(400, 'Validate error', {
          draw_datetime: 'draw date should be greater than end date'
        });
      }

      if(id) {
        const raffleExists = await this.raffleRepository.findByPk(id);
        if(!raffleExists) {
          throw new ValidateError(400, 'Validate error', {
            id: 'Raffle not found'
          });
        }

        if(raffleExists.organization_id !== organization_id) {
          throw new ValidateError(400, 'Validate error', {
            organization_id: 'Cannot change the organization of a raffle'
          });
        }

        if(body.start_datetime) {
          throw new ValidateError(400, 'Validate error', {
            start_datetime: 'Cannot change the start date and time of a raffle'
          });
        }

        if(body.end_datetime) {
          throw new ValidateError(400, 'Validate error', {
            end_datetime: 'Cannot change the end date and time of a raffle'
          });
        }

        if(body.draw_datetime) {
          throw new ValidateError(400, 'Validate error', {
            draw_datetime: 'Cannot change the draw date and time of a raffle'
          });
        }

        if(moment(raffleExists.start_datetime).diff(moment()) >= 0) {
          if(admin_fees_percent) {
            throw new ValidateError(400, 'Validate error', {
              admin_fees_percent: 'Cannot change the percentages for a started or ended raffle'
            });
          }

          if(donation_percent) {
            throw new ValidateError(400, 'Validate error', {
              donation_percent: 'Cannot change the percentages for a started or ended raffle'
            });
          }

          if(raffle_draw_percent) {
            throw new ValidateError(400, 'Validate error', {
              raffle_draw_percent: 'Cannot change the percentages for a started or ended raffle'
            });
          }

          if(progressive_draw_percent) {
            throw new ValidateError(400, 'Validate error', {
              progressive_draw_percent: 'Cannot change the percentages for a started or ended raffle'
            });
          }


          if(organization_percent) {
            throw new ValidateError(400, 'Validate error', {
              organization_percent: 'Cannot change the percentages for a started or ended raffle'
            });
          }

          if(beneficiary_percent) {
            throw new ValidateError(400, 'Validate error', {
              beneficiary_percent: 'Cannot change the percentages for a started or ended raffle'
            });
          }

          if(draw_type) {
            throw new ValidateError(400, 'Validate error', {
              draw_type: 'Cannot change the draw type of a started or ended raffle'
            })
          }

          if(progressive_draw_id) {
            throw new ValidateError(400, 'Validate error', {
              draw_datetime: 'Cannot change the progressive draw of a started or ended raffle'
            });
          }
        }
      }

      if(organization_id !== req.user.organization_id) {
        throw new ValidateError(400, 'Validate error', {
          organization_id: 'Cannot create or update a raffle for another organization'
        });
      }

      const organizationExists = await this.organizationRepository.findByPk(organization_id);
      if(!organizationExists) {
        throw new ValidateError(400, 'Validate error', {
          organization_id: 'Invalid organization'
        });
      }

      if(organizationExists.type !== organizationConstants.organizationType.organization) {
        throw new ValidateError(400, 'Validate error', {
          organization_id: 'Only an organization can create or update a raffle'
        });
      }

      if(draw_type === raffleConstants.drawType.normal) {
        if(!progressive_draw_id) {
          throw new ValidateError(400, 'Validate error', {
            progressive_draw_id: 'A 5050 draw must have an associated progressive draw'
          })
        }
        const progressiveDrawExists = await this.raffleRepository.findByPk(progressive_draw_id);

        if(!progressiveDrawExists) {
          throw new ValidateError(400, 'Validate error', {
            progressive_draw_id: 'Progressive draw invalid'
          });
        }

        if(progressiveDrawExists.draw_type !== raffleConstants.drawType.progressive) {
          throw new ValidateError(400, 'Validate error', {
            progressive_draw_id: 'Not a progressive draw'
          });
        }

        if(moment(progressiveDrawExists.end_datetime).diff(moment()) < 0) {
          throw new ValidateError(400, 'Validate error', {
            progressive_draw_id: 'Progressive draw has already ended'
          });
        }

        if(moment(progressiveDrawExists.draw_datetime).diff(moment(body.draw_datetime)) < 0) {
          throw new ValidateError(400, 'Validate error', {
            progressive_draw_id: 'Draw date of the draw should be less than the draw date of the progressive draw'
          });
        }

        if(admin_fees_percent + donation_percent + raffle_draw_percent + progressive_draw_percent + organization_percent + beneficiary_percent !== 100.0) {
          throw new ValidateError(400, 'Validate error', {
            admin_fees_percent: 'Sum of percentages should always be 100 for a 5050 raffle',
            donation_percent: 'Sum of percentages should always be 100 for a 5050 raffle',
            raffle_draw_percent: 'Sum of percentages should always be 100 for a 5050 raffle',
            progressive_draw_percent: 'Sum of percentages should always be 100 for a 5050 raffle',
            organization_percent: 'Sum of percentages should always be 100 for a 5050 raffle',
            beneficiary_percent: 'Sum of percentages should always be 100 for a 5050 raffle',
          });
        }
      }else {
        if(progressive_draw_id) {
          throw new ValidateError(400, 'Validate error', {
            progressive_draw_id: 'Cannot create a nested progressive draw'
          });
        }

        if(admin_fees_percent || donation_percent || raffle_draw_percent || progressive_draw_percent || organization_percent || beneficiary_percent) {
          throw new ValidateError(400, 'Validate error', {
            admin_fees_percent: 'Progressive draw can\'t have percentages',
            donation_percent: 'Progressive draw can\'t have percentages',
            raffle_draw_percent: 'Progressive draw can\'t have percentages',
            progressive_draw_percent: 'Progressive draw can\'t have percentages',
            organization_percent: 'Progressive draw can\'t have percentages',
            beneficiary_percent: 'Progressive draw can\'t have percentages',
          });
        }
      }

      return body;
    });
  }

  addBundle() {
    const bodySchema = {
      quantity: Joi.number().integer().min(1).max(1000000).required(),
      price: Joi.number().precision(2).min(0.50).max(999999.99).required(),
      raffle_id: Joi.number().integer().required()
    };

    return this.validate(null, bodySchema, async(req, query, body) => {
      const {raffle_id} = body;

      const raffleExists = await this.raffleRepository.findByPk(raffle_id);

      if(!raffleExists) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle not found'
        });
      }

      if(raffleExists.organization_id !== req.user.organization_id) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'This raffle doesn\'t belong to your organization'
        });
      }

      if(raffleExists.draw_type === raffleConstants.drawType.progressive) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Cannot create ticket bundle for a progressive draw'
        });
      }

      if(moment(raffleExists.start_datetime).diff(moment()) > 0) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Cannot create ticket bundles for a draw that has already started'
        });
      }

      return body;
    });
  }

  getTicketBundles() {
    const querySchema = {
      raffleId: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, async (req, query) => {
      const raffleExists = await this.raffleRepository.findByPk(query.raffleId);

      if(!raffleExists) {
        throw new ValidateError(400, 'Validate error', {
          id: 'Raffle not found'
        });
      }

      return query.raffleId;
    });
  }
}

module.exports = RaffleValidator;
