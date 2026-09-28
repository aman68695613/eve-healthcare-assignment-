const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EVE Healthcare — Diagnostic Booking API',
      version: '1.0.0',
      description:
        'Backend API for diagnostic test bookings and simulated payments. Built for the EVE Healthcare SDE Intern Assignment.',
      contact: {
        name: 'Aman Srivastava',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'User authentication endpoints' },
      { name: 'Centres', description: 'Diagnostic centres and tests management' },
      { name: 'Bookings', description: 'Booking management' },
      { name: 'Payments', description: 'Simulated payment processing and webhooks' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
