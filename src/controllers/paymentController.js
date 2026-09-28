const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const { sequelize } = require('../config/database');
const { Booking, Payment } = require('../models');
const logger = require('../utils/logger');

/**
 * POST /api/payments
 * Simulate a payment for a booking.
 * Randomly resolves to SUCCESS or FAILED.
 */
const processPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { booking_id } = req.body;

    // Verify booking exists and belongs to the authenticated user
    const booking = await Booking.findOne({
      where: { id: booking_id, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Only PENDING bookings can be paid for
    if (booking.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot process payment for a booking with status "${booking.status}". Only PENDING bookings can be paid.`,
      });
    }

    // Simulate payment outcome: ~70% success, ~30% failure
    const isSuccess = Math.random() < 0.7;
    const paymentStatus = isSuccess ? 'SUCCESS' : 'FAILED';
    const transactionId = `TXN_${uuidv4()}`;

    // Use a transaction to ensure atomicity
    const result = await sequelize.transaction(async (t) => {
      const payment = await Payment.create(
        {
          booking_id: booking.id,
          amount: booking.amount,
          status: paymentStatus,
          transaction_id: transactionId,
          payment_method: 'SIMULATED',
          processed_at: new Date(),
        },
        { transaction: t }
      );

      // Update booking status based on payment result
      booking.status = isSuccess ? 'CONFIRMED' : 'FAILED';
      await booking.save({ transaction: t });

      return payment;
    });

    logger.info(`Payment processed: ${result.transaction_id} — ${paymentStatus} for booking ${booking.id}`);

    res.status(200).json({
      success: true,
      message: isSuccess
        ? 'Payment successful. Booking confirmed.'
        : 'Payment failed. Please try again.',
      data: {
        payment: {
          id: result.id,
          transaction_id: result.transaction_id,
          amount: result.amount,
          status: result.status,
          processed_at: result.processed_at,
        },
        booking: {
          id: booking.id,
          status: booking.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/webhook
 * Idempotent webhook endpoint for payment-status updates from a simulated payment provider.
 *
 * Expected payload:
 * {
 *   "transaction_id": "TXN_...",
 *   "status": "SUCCESS" | "FAILED",
 *   "booking_id": "..."
 * }
 *
 * Idempotency is ensured by:
 * 1. Checking if a payment with the same transaction_id already exists.
 * 2. If it does, and the status matches, return 200 (no-op).
 * 3. If a payment already exists with a terminal status, reject conflicting updates.
 */
const paymentWebhook = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { transaction_id, status, booking_id } = req.body;

    // ── Idempotency check ──────────────────────────────────────────
    const existingPayment = await Payment.findOne({ where: { transaction_id } });

    if (existingPayment) {
      // Same event received again — idempotent, return success
      if (existingPayment.status === status) {
        logger.info(`Webhook duplicate (idempotent): ${transaction_id} already ${status}`);
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed. No action taken (idempotent).',
          data: {
            payment: {
              id: existingPayment.id,
              transaction_id: existingPayment.transaction_id,
              status: existingPayment.status,
            },
          },
        });
      }

      // Conflicting status for same transaction — reject
      logger.warn(
        `Webhook conflict: ${transaction_id} is ${existingPayment.status}, received ${status}`
      );
      return res.status(409).json({
        success: false,
        message: `Payment ${transaction_id} already has status "${existingPayment.status}". Cannot update to "${status}".`,
      });
    }

    // ── Validate booking ───────────────────────────────────────────
    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Don't process payments for bookings that are already in a terminal state
    if (['CONFIRMED', 'CANCELLED'].includes(booking.status)) {
      logger.warn(
        `Webhook rejected: booking ${booking_id} is already ${booking.status}`
      );
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}. Cannot process payment.`,
      });
    }

    // ── Create payment & update booking atomically ─────────────────
    const result = await sequelize.transaction(async (t) => {
      const payment = await Payment.create(
        {
          booking_id,
          amount: booking.amount,
          status,
          transaction_id,
          payment_method: 'WEBHOOK',
          processed_at: new Date(),
        },
        { transaction: t }
      );

      booking.status = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
      await booking.save({ transaction: t });

      return payment;
    });

    logger.info(`Webhook processed: ${transaction_id} — ${status} for booking ${booking_id}`);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully.',
      data: {
        payment: {
          id: result.id,
          transaction_id: result.transaction_id,
          status: result.status,
        },
        booking: {
          id: booking.id,
          status: booking.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/:bookingId
 * Get payment history for a specific booking (authenticated user only).
 */
const getPaymentsByBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.bookingId, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const payments = await Payment.findAll({
      where: { booking_id: booking.id },
      order: [['created_at', 'DESC']],
    });

    res.json({
      success: true,
      data: { booking_id: booking.id, payments },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { processPayment, paymentWebhook, getPaymentsByBooking };
