const {
  app,
  request,
  setupTestDB,
  teardownTestDB,
  createTestUser,
  createTestCentre,
  createTestDiagnostic,
} = require('./setup');

let authToken, centreId, testId, bookingId;

beforeAll(async () => {
  await setupTestDB();
  const { token } = await createTestUser();
  authToken = token;

  const centre = await createTestCentre(authToken);
  centreId = centre.id;

  const diagnosticTest = await createTestDiagnostic(authToken, centreId);
  testId = diagnosticTest.id;

  // Create a booking
  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      test_id: testId,
      centre_id: centreId,
      appointment_date: '2026-12-15',
      appointment_time: '10:30',
    });
  bookingId = bookingRes.body.data.booking.id;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Payments API', () => {
  // ─── Process Payment ─────────────────────────────────────────────
  describe('POST /api/payments', () => {
    it('should process a payment for a PENDING booking', async () => {
      // Create a fresh booking for this test
      const bRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-25',
          appointment_time: '11:00',
        });
      const bid = bRes.body.data.booking.id;

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ booking_id: bid });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.transaction_id).toBeDefined();
      expect(['SUCCESS', 'FAILED']).toContain(res.body.data.payment.status);
      expect(['CONFIRMED', 'FAILED']).toContain(res.body.data.booking.status);
    });

    it('should reject payment for non-existent booking', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ booking_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.status).toBe(404);
    });

    it('should reject payment without authentication', async () => {
      const res = await request(app)
        .post('/api/payments')
        .send({ booking_id: bookingId });

      expect(res.status).toBe(401);
    });

    it('should reject payment with missing booking_id', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject payment with invalid UUID', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ booking_id: 'not-a-uuid' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Payment Webhook ─────────────────────────────────────────────
  describe('POST /api/payments/webhook', () => {
    let webhookBookingId;

    beforeEach(async () => {
      // Create a fresh PENDING booking for each webhook test
      const bRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-28',
          appointment_time: '09:00',
        });
      webhookBookingId = bRes.body.data.booking.id;
    });

    it('should process a SUCCESS webhook', async () => {
      const txnId = `TXN_WEBHOOK_${Date.now()}_success`;

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: txnId,
          status: 'SUCCESS',
          booking_id: webhookBookingId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.status).toBe('SUCCESS');
      expect(res.body.data.booking.status).toBe('CONFIRMED');
    });

    it('should process a FAILED webhook', async () => {
      const txnId = `TXN_WEBHOOK_${Date.now()}_fail`;

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: txnId,
          status: 'FAILED',
          booking_id: webhookBookingId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.payment.status).toBe('FAILED');
      expect(res.body.data.booking.status).toBe('FAILED');
    });

    it('should be idempotent — duplicate webhook returns 200 without side effects', async () => {
      const txnId = `TXN_WEBHOOK_${Date.now()}_idempotent`;

      // First call
      const res1 = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: txnId,
          status: 'SUCCESS',
          booking_id: webhookBookingId,
        });

      expect(res1.status).toBe(200);

      // Duplicate call — same transaction_id & status
      const res2 = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: txnId,
          status: 'SUCCESS',
          booking_id: webhookBookingId,
        });

      expect(res2.status).toBe(200);
      expect(res2.body.message).toContain('idempotent');
    });

    it('should reject conflicting status for same transaction_id', async () => {
      const txnId = `TXN_WEBHOOK_${Date.now()}_conflict`;

      // First call — SUCCESS
      await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: txnId,
          status: 'SUCCESS',
          booking_id: webhookBookingId,
        });

      // Create another booking for the second call
      const bRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-29',
          appointment_time: '14:00',
        });

      // Same transaction_id but FAILED status → conflict
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: txnId,
          status: 'FAILED',
          booking_id: bRes.body.data.booking.id,
        });

      expect(res.status).toBe(409);
    });

    it('should reject webhook for non-existent booking', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: `TXN_${Date.now()}_nobook`,
          status: 'SUCCESS',
          booking_id: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
    });

    it('should reject webhook with invalid status', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          transaction_id: `TXN_${Date.now()}_badstatus`,
          status: 'INVALID',
          booking_id: webhookBookingId,
        });

      expect(res.status).toBe(400);
    });

    it('should reject webhook with missing fields', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── Get Payment History ─────────────────────────────────────────
  describe('GET /api/payments/:bookingId', () => {
    it('should return payment history for a booking', async () => {
      // Create booking + payment
      const bRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          test_id: testId,
          centre_id: centreId,
          appointment_date: '2026-12-30',
          appointment_time: '16:00',
        });
      const bid = bRes.body.data.booking.id;

      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ booking_id: bid });

      const res = await request(app)
        .get(`/api/payments/${bid}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.payments).toBeInstanceOf(Array);
      expect(res.body.data.payments.length).toBeGreaterThan(0);
    });

    it('should return 404 for other user\'s booking', async () => {
      const { token: otherToken } = await createTestUser({
        email: 'other-payment@example.com',
      });

      const res = await request(app)
        .get(`/api/payments/${bookingId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });
  });
});
