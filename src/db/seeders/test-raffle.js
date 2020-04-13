const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('organizations', [{
      id: 1,
      name: 'test organization',
      type: 'organization',
      address_line1: 'address',
      city: 'city',
      state: 'state',
      country: 'us',
      zip: 'zip',
      time_format: '12h',
      logo_url: 'https://example.com/logo.png',
      website_url: 'https://example.com',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    for (let beneficiaryId = 2; beneficiaryId <= 5; beneficiaryId++) {
      await queryInterface.bulkInsert('organizations', [{
        id: beneficiaryId,
        name: `test beneficiary ${beneficiaryId}`,
        type: 'beneficiary',
        address_line1: 'address',
        city: 'city',
        state: 'state',
        country: 'us',
        zip: 'zip',
        time_format: '12h',
        logo_url: 'https://example.com/logo.png',
        website_url: 'https://example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      await queryInterface.bulkInsert('beneficiaries', [{
        id: beneficiaryId - 1,
        user_id: beneficiaryId,
        organization_id: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }

    await queryInterface.bulkInsert('users', [{
      id: 1,
      email: 'test@example.com',
      password: await bcrypt.hash('1234', 10),
      mobile: '0123456789',
      firstname: 'firstname',
      lastname: 'lastname',
      is_email_allowed: false,
      organization_id: 1,
      status: 'active',
      user_type: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    for (let sellerId = 2; sellerId <= 5; sellerId++) {
      await queryInterface.bulkInsert('users', [{
        id: sellerId,
        email: `seller_${sellerId}@example.com`,
        password: await bcrypt.hash('1234', 10),
        mobile: `0123456789-${sellerId}`,
        firstname: 'firstname',
        lastname: 'lastname',
        is_email_allowed: false,
        organization_id: 1,
        status: 'active',
        user_type: 'seller',
        createdAt: new Date(),
        updatedAt: new Date()
      }])
    }

    await queryInterface.bulkInsert('raffles', [{
      id: 1,
      raffle_name: 'test raffle',
      raffle_description: 'hello world',
      slug: 'test',
      organization_id: 1,
      start_datetime: '2020-05-01T12:10:26.573Z',
      end_datetime: '2020-05-01T12:10:26.573Z',
      draw_datetime: '2020-05-01T12:10:26.573Z',
      draw_type: 'progressive',
      progressive_draw_id: null,
      admin_fees_percent: 0.1,
      donation_percent: 0.1,
      raffle_draw_percent: 0.1,
      progressive_draw_percent: 0.1,
      organization_percent: 0.1,
      beneficiary_percent: 0.1,
      peerplays_draw_id: 1,
      image_url: 'https://example.com/raffle.png',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    let nextEntryId = 1;

    for (let i = 1; i < 1000; i++) {
      const playerId = 6 + i;

      await queryInterface.bulkInsert('users', [{
        id: playerId,
        email: `player_${playerId}@example.com`,
        mobile: `0123456789-${playerId}`,
        firstname: `player_${playerId}`,
        lastname: 'lastname',
        is_email_allowed: false,
        organization_id: null,
        status: 'active',
        user_type: 'player',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      await queryInterface.bulkInsert('sales', [{
        id: i,
        raffle_id: 1,
        player_id: playerId,
        ticketbundle_id: null,
        total_price: Math.floor(Math.random() * 10),
        beneficiary_id: 1 + Math.floor(Math.random() * 3),
        seller_id: 2 + Math.floor(Math.random() * 3),
        stripe_payment_id: null,
        payment_type: 'cash',
        payment_status: 'success',
        createdAt: new Date(),
        updatedAt: new Date()
      }]);

      const numEntries = Math.floor(1 + Math.random() * 4);

      for (let q = 0; q < numEntries; q++) {
        await queryInterface.bulkInsert('entries', [{
          id: nextEntryId++,
          ticket_sales_id: i,
          peerplays_raffle_ticket_id: nextEntryId,
          peerplays_progressive_ticket_id: nextEntryId,
          createdAt: new Date(),
          updatedAt: new Date()
        }]);
      }
    }
  },
  down: async (queryInterface, Sequelize) => {}
};
