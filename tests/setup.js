/**
 * Shared test setup and utilities.
 * Uses SQLite in-memory database (via NODE_ENV=test).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');

// Import models to ensure associations are set up
require('../src/models');

/**
 * Initialize the test database.
 */
const setupTestDB = async () => {
  await sequelize.sync({ force: true });
};

/**
 * Close the test database connection.
 */
const teardownTestDB = async () => {
  await sequelize.close();
};

/**
 * Register a test user and return the user object + JWT token.
 */
const createTestUser = async (overrides = {}) => {
  const userData = {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'password123',
    ...overrides,
  };

  const res = await request(app).post('/api/auth/signup').send(userData);
  return {
    user: res.body.data.user,
    token: res.body.data.token,
    password: userData.password,
  };
};

/**
 * Create a diagnostic centre via direct model creation.
 */
const createTestCentre = async (token, overrides = {}) => {
  const centreData = {
    name: 'Test Diagnostics Centre',
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
    phone: '1234567890',
    ...overrides,
  };

  const res = await request(app)
    .post('/api/centres')
    .set('Authorization', `Bearer ${token}`)
    .send(centreData);

  return res.body.data.centre;
};

/**
 * Add a diagnostic test to a centre.
 */
const createTestDiagnostic = async (token, centreId, overrides = {}) => {
  const testData = {
    name: 'Blood Test',
    description: 'Standard blood panel',
    price: 500,
    ...overrides,
  };

  const res = await request(app)
    .post(`/api/centres/${centreId}/tests`)
    .set('Authorization', `Bearer ${token}`)
    .send(testData);

  return res.body.data.test;
};

module.exports = {
  app,
  request,
  setupTestDB,
  teardownTestDB,
  createTestUser,
  createTestCentre,
  createTestDiagnostic,
};
