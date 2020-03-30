const Joi = require('joi');
const BaseValidator = require('./abstract/base.validator');
const ValidateError = require('../errors/validate.error');
const raffleConstants = require('../constants/raffle');
const saleConstants = require('../constants/sale');
const profileConstants = require('../constants/profile');
const organizationConstants = require('../constants/organization');
const organizationRepository = require('../repositories/organization.repository');
const raffleRepository = require('../repositories/raffle.repository');
const bundleRepository = require('../repositories/bundle.repository');
const userRepository = require('../repositories/user.repository');
const saleRepository = require('../repositories/sale.repository');
const moment = require('moment');

class RaffleValidator extends BaseValidator {

  constructor() {
    super();

    this.organizationRepository = new organizationRepository();
    this.raffleRepository = new raffleRepository();
    this.bundleRepository = new bundleRepository();
    this.userRepository = new userRepository();
    this.saleRepository = new saleRepository();

    this.getRaffleById = this.getRaffleById.bind(this);
    this.getRafflesByOrganization = this.getRafflesByOrganization.bind(this);
    this.addRaffle = this.addRaffle.bind(this);
    this.addBundle = this.addBundle.bind(this);
    this.getTicketBundles = this.getTicketBundles.bind(this);
    this.createPayment = this.createPayment.bind(this);
    this.initStripeTicketPurchase = this.initStripeTicketPurchase.bind(this);
    this.ticketPurchase = this.ticketPurchase.bind(this);
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

        if(raffleExists.start_datetime !== body.start_datetime) {
          throw new ValidateError(400, 'Validate error', {
            start_datetime: 'Cannot change the start date and time of a raffle'
          });
        }

        if(raffleExists.end_datetime !== body.end_datetime) {
          throw new ValidateError(400, 'Validate error', {
            end_datetime: 'Cannot change the end date and time of a raffle'
          });
        }

        if(raffleExists.draw_datetime !== body.draw_datetime) {
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

      if(moment(raffleExists.start_datetime).diff(moment()) < 0) {
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

  createPayment() {
    const querySchema = {
      bundleId: Joi.number().integer().required()
    };

    return this.validate(querySchema, null, async (req, query) => {
      const bundleExists = await this.bundleRepository.findByPk(query.bundleId, {
        include: [{
          model: this.raffleRepository.model
        }]
      });

      if(!bundleExists) {
        throw new ValidateError(400, 'Validate error', {
          bundleId: 'Ticket bundle not found'
        });
      }

      if(moment(bundleExists.raffle.end_datetime).diff(moment()) < 0) {
        throw new ValidateError(400, 'Validate error', {
          bundleId: 'Raffle has already ended'
        });
      }

      return bundleExists.price;
    });
  }

  initStripeTicketPurchase() {
    const bodySchema = {
      raffle_id: Joi.number().integer().required(),
      beneficiary_id: Joi.number().integer().required(),
      player_id: Joi.number().integer().required(),
      ticketbundle_id: Joi.number().integer().required(),
      total_price: Joi.number().precision(2).min(0.50).max(999999.99).required(),
      stripe_payment_id: Joi.string(),
      payment_type: Joi.string().valid(saleConstants.paymentType.stripe).required()
    };

    return this.validate(null, bodySchema, async(req, query, body) => {
      const {raffle_id, ticketbundle_id, total_price, player_id, beneficiary_id, stripe_payment_id} = body;
      const raffleExists = await this.raffleRepository.findByPk(raffle_id);

      if(!raffleExists) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle not found'
        });
      }

      if(moment(raffleExists.start_datetime).diff(moment()) > 0) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle has not started yet'
        });
      }

      if(moment(raffleExists.end_datetime).diff(moment()) < 0) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle has already ended'
        });
      }

      if(raffleExists.draw_type === raffleConstants.drawType.progressive) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Cannot buy ticket for a progressive draw'
        });
      }

      const bundleExists = await this.bundleRepository.findByPk(ticketbundle_id);

      if(!bundleExists) {
        throw new ValidateError(400, 'Validate error', {
          ticketbundle_id: 'Ticket bundle not found'
        });
      }

      if(bundleExists.raffle_id !== raffle_id) {
        throw new ValidateError(400, 'Validate error', {
          ticketbundle_id: 'Bundle does not belong to this raffle'
        });
      }

      if(bundleExists.price !== total_price) {
        throw new ValidateError(400, 'Validate error', {
          total_price: 'Total price does not match the bundle price'
        });
      }

      const playerExists = await this.userRepository.findByPk(player_id);

      if(!playerExists || playerExists.user_type !== profileConstants.userType.player || playerExists.status !== profileConstants.status.active) {
        throw new ValidateError(400, 'Validate error', {
          player_id: 'Player not found or inactive'
        });
      }

      const beneficiaryExists = await this.organizationRepository.findByPk(beneficiary_id);

      if(!beneficiaryExists || beneficiaryExists.type !== organizationConstants.organizationType.beneficiary) {
        throw new ValidateError(400, 'Validate error', {
          beneficiary_id: 'Beneficiary not found'
        });
      }

      if(!body.hasOwnProperty('stripe_payment_id')) {
        throw new ValidateError(400, 'Validate error', {
          stripe_payment_id: 'Required for stripe payment'
        });
      }

      const saleExists = this.saleRepository.findSaleByStripePaymentId(stripe_payment_id);
      if(saleExists.length > 0) {
        throw new ValidateError(400, 'Validate error', {
          stripe_payment_id: 'Payment already initiated. Cannot reinitiate.'
        });
      }

      return body;
    });
  }

  ticketPurchase() {
    const bodySchema = {
      raffle_id: Joi.number().integer().required(),
      beneficiary_id: Joi.number().integer().required(),
      player_id: Joi.number().integer().required(),
      ticketbundle_id: Joi.number().integer().required(),
      total_price: Joi.number().precision(2).min(0.50).max(999999.99).required(),
      seller_password: Joi.string(),
      stripe_payment_id: Joi.string(),
      payment_type: Joi.string().valid(Object.values(saleConstants.paymentType)).required()
    };

    return this.validate(null, bodySchema, async(req, query, body) => {
      const {raffle_id, ticketbundle_id, total_price, player_id, beneficiary_id, payment_type, seller_password} = body;
      const raffleExists = await this.raffleRepository.findByPk(raffle_id);

      if(!raffleExists) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle not found'
        });
      }

      if(moment(raffleExists.start_datetime).diff(moment()) > 0) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle has not started yet'
        });
      }

      if(moment(raffleExists.end_datetime).diff(moment()) < 0) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Raffle has already ended'
        });
      }

      if(raffleExists.draw_type === raffleConstants.drawType.progressive) {
        throw new ValidateError(400, 'Validate error', {
          raffle_id: 'Cannot buy ticket for a progressive draw'
        });
      }

      const bundleExists = await this.bundleRepository.findByPk(ticketbundle_id);

      if(!bundleExists) {
        throw new ValidateError(400, 'Validate error', {
          ticketbundle_id: 'Ticket bundle not found'
        });
      }

      if(bundleExists.raffle_id !== raffle_id) {
        throw new ValidateError(400, 'Validate error', {
          ticketbundle_id: 'Bundle does not belong to this raffle'
        });
      }

      if(bundleExists.price !== total_price) {
        throw new ValidateError(400, 'Validate error', {
          total_price: 'Total price does not match the bundle price'
        });
      }

      const playerExists = await this.userRepository.findByPk(player_id);

      if(!playerExists || playerExists.user_type !== profileConstants.userType.player || playerExists.status !== profileConstants.status.active) {
        throw new ValidateError(400, 'Validate error', {
          player_id: 'Player not found or inactive'
        });
      }

      const beneficiaryExists = await this.organizationRepository.findByPk(beneficiary_id);

      if(!beneficiaryExists || beneficiaryExists.type !== organizationConstants.organizationType.beneficiary) {
        throw new ValidateError(400, 'Validate error', {
          beneficiary_id: 'Beneficiary not found'
        });
      }

      if(payment_type === saleConstants.paymentType.cash && !body.hasOwnProperty('seller_password')) {
        throw new ValidateError(400, 'Validate error', {
          seller_password: 'Required for cash payment'
        });
      }

      if(payment_type === saleConstants.paymentType.cash) {
        const sellerExists = await this.userRepository.matchSellerPassword(raffleExists.organization_id, seller_password);

        if(!sellerExists) {
          throw new ValidateError(400, 'Validate error', {
            seller_password: 'Seller not found or inactive. Please contact your admin.'
          });
        }
      }

      if(payment_type === saleConstants.paymentType.stripe) {
        if(!body.hasOwnProperty('stripe_payment_id')) {
          throw new ValidateError(400, 'Validate error', {
            stripe_payment_id: 'Required for stripe payment'
          });
        }

        const saleExists = this.saleRepository.findSaleByStripePaymentId(body.stripe_payment_id);
        if(saleExists.length > 0 && saleExists[0].payment_status === saleConstants.paymentStatus.cancel) {
          throw new ValidateError(400, 'Validate error', {
            stripe_payment_id: 'Payment cancelled.'
          });
        }
      }

      return body;
    });
  }
}

module.exports = RaffleValidator;
