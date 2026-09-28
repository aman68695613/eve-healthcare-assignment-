const {
  app,
  request,
  setupTestDB,
  teardownTestDB,
  createTestUser,
} = require('./setup');

let authToken;

beforeAll(async () => {
  await setupTestDB();
  const { token } = await createTestUser();
  authToken = token;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Centres API', () => {
  let centreId;

  // ─── Create Centre ───────────────────────────────────────────────
  describe('POST /api/centres', () => {
    it('should create a centre when authenticated', async () => {
      const res = await request(app)
        .post('/api/centres')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Diagnostics',
          address: '456 Test Ave',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.centre.name).toBe('Test Diagnostics');
      centreId = res.body.data.centre.id;
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/centres').send({
        name: 'No Auth Centre',
        address: '789 Street',
        city: 'City',
        state: 'State',
      });

      expect(res.status).toBe(401);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/centres')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Incomplete Centre' });

      expect(res.status).toBe(400);
    });
  });

  // ─── List Centres ────────────────────────────────────────────────
  describe('GET /api/centres', () => {
    it('should list centres with pagination', async () => {
      const res = await request(app).get('/api/centres');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.centres).toBeInstanceOf(Array);
      expect(res.body.data.pagination).toHaveProperty('total');
      expect(res.body.data.pagination).toHaveProperty('page');
    });

    it('should respect pagination parameters', async () => {
      const res = await request(app).get('/api/centres?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.limit).toBe(5);
    });
  });

  // ─── Get Single Centre ──────────────────────────────────────────
  describe('GET /api/centres/:id', () => {
    it('should return a centre by ID', async () => {
      const res = await request(app).get(`/api/centres/${centreId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.centre.id).toBe(centreId);
    });

    it('should return 404 for non-existent centre', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app).get(`/api/centres/${fakeId}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Add Tests ───────────────────────────────────────────────────
  describe('POST /api/centres/:centreId/tests', () => {
    it('should add a test to a centre', async () => {
      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'CBC Test',
          description: 'Complete blood count',
          price: 500,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.test.name).toBe('CBC Test');
    });

    it('should reject negative price', async () => {
      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Bad Price Test',
          price: -100,
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing test name', async () => {
      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ price: 500 });

      expect(res.status).toBe(400);
    });
  });

  // ─── List Tests by Centre ────────────────────────────────────────
  describe('GET /api/centres/:centreId/tests', () => {
    it('should list tests for a centre', async () => {
      const res = await request(app).get(`/api/centres/${centreId}/tests`);

      expect(res.status).toBe(200);
      expect(res.body.data.tests).toBeInstanceOf(Array);
      expect(res.body.data.tests.length).toBeGreaterThan(0);
    });
  });
});
