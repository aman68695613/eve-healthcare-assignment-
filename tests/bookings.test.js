const {
  app,
  request,
  setupTestDB,
  teardownTestDB,
  createTestUser,
  createTestCentre,
  createTestDiagnostic,
} = require('./setup');

let authToken, userId, centreId, testId;

beforeAll(async () => {
  await setupTestDB();
  const { user, token } = await createTestUser();
  authToken = token;
  userId = user.id;

  const centre = await createTestCentre(authToken);
  centreId = centre.id;

  const diagnosticTest = await createTestDiagnostic(authToken, centreId);
  testId = diagnosticTest.id;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Bookings API', () => {
  let bookingId;

  // ─── Create Booking ──────────────────────────────────────────────
  describe('POST /api/bookings', () => {
    it('should create a booking', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-15',
          appointment_time: '10:30',
          notes: 'Fasting required',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.status).toBe('PENDING');
      expect(res.body.data.booking.amount).toBeDefined();
      bookingId = res.body.data.booking.id;
    });

    it('should reject booking without authentication', async () => {
      const res = await request(app).post('/api/bookings').send({
        test_id: testId,
        centre_id: centreId,
        appointment_date: '2026-12-15',
        appointment_time: '10:30',
      });

      expect(res.status).toBe(401);
    });

    it('should reject booking with non-existent test', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: '00000000-0000-0000-0000-000000000000',
          centre_id: centreId,
          appointment_date: '2026-12-15',
          appointment_time: '10:30',
        });

      expect(res.status).toBe(404);
    });

    it('should reject booking with non-existent centre', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: '00000000-0000-0000-0000-000000000000',
          appointment_date: '2026-12-15',
          appointment_time: '10:30',
        });

      expect(res.status).toBe(404);
    });

    it('should reject past appointment date', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2020-01-01',
          appointment_time: '10:30',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid time format', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-15',
          appointment_time: '25:99',
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── List Bookings ───────────────────────────────────────────────
  describe('GET /api/bookings', () => {
    it('should list user bookings', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toBeInstanceOf(Array);
      expect(res.body.data.bookings.length).toBeGreaterThan(0);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/bookings?status=PENDING')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.data.bookings.forEach((b) => {
        expect(b.status).toBe('PENDING');
      });
    });

    it('should not show bookings of other users', async () => {
      const { token: otherToken } = await createTestUser({
        email: 'other@example.com',
      });

      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(0);
    });
  });

  // ─── Get Single Booking ──────────────────────────────────────────
  describe('GET /api/bookings/:id', () => {
    it('should get booking details', async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.id).toBe(bookingId);
      expect(res.body.data.booking.test).toBeDefined();
      expect(res.body.data.booking.centre).toBeDefined();
    });

    it('should return 404 for non-existent booking', async () => {
      const res = await request(app)
        .get('/api/bookings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should not show another user\'s booking', async () => {
      const { token: otherToken } = await createTestUser({
        email: 'hacker@example.com',
      });

      const res = await request(app)
        .get(`/api/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Cancel Booking ──────────────────────────────────────────────
  describe('PATCH /api/bookings/:id/cancel', () => {
    it('should cancel a PENDING booking', async () => {
      // Create a new booking to cancel
      const createRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-20',
          appointment_time: '14:00',
        });
      const cancelId = createRes.body.data.booking.id;

      const res = await request(app)
        .patch(`/api/bookings/${cancelId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('CANCELLED');
    });

    it('should not cancel an already cancelled booking', async () => {
      // Create and cancel
      const createRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-21',
          appointment_time: '09:00',
        });
      const bid = createRes.body.data.booking.id;

      await request(app)
        .patch(`/api/bookings/${bid}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to cancel again
      const res = await request(app)
        .patch(`/api/bookings/${bid}/cancel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });
});
