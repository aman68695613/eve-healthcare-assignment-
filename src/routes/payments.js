const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  processPayment,
  paymentWebhook,
  getPaymentsByBooking,
} = require('../controllers/paymentController');

const router = express.Router();

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Process a simulated payment for a booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [booking_id]
 *             properties:
 *               booking_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Payment processed (may succeed or fail)
 *       400:
 *         description: Invalid booking or already paid
 *       404:
 *         description: Booking not found
 */
router.post(
  '/',
  authenticate,
  [
    body('booking_id')
      .notEmpty().withMessage('Booking ID is required')
      .isUUID().withMessage('Booking ID must be a valid UUID'),
  ],
  processPayment
);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Receive payment status webhook (idempotent)
 *     tags: [Payments]
 *     description: |
 *       Accepts payment-status updates from a simulated payment provider.
 *       This endpoint is **idempotent** — duplicate events with the same
 *       transaction_id will not cause duplicate records or state corruption.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transaction_id, status, booking_id]
 *             properties:
 *               transaction_id:
 *                 type: string
 *                 example: TXN_abc-123-def
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *               booking_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Webhook processed (or duplicate acknowledged)
 *       400:
 *         description: Invalid payload or booking already terminal
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Conflicting status for existing transaction
 */
router.post(
  '/webhook',
  [
    body('transaction_id')
      .notEmpty().withMessage('Transaction ID is required')
      .isString().withMessage('Transaction ID must be a string'),
    body('status')
      .notEmpty().withMessage('Status is required')
      .isIn(['SUCCESS', 'FAILED']).withMessage('Status must be either SUCCESS or FAILED'),
    body('booking_id')
      .notEmpty().withMessage('Booking ID is required')
      .isUUID().withMessage('Booking ID must be a valid UUID'),
  ],
  paymentWebhook
);

/**
 * @swagger
 * /api/payments/{bookingId}:
 *   get:
 *     summary: Get payment history for a booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Payment history
 *       404:
 *         description: Booking not found
 */
router.get('/:bookingId', authenticate, getPaymentsByBooking);

module.exports = router;
