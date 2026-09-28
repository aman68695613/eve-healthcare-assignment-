const { validationResult } = require('express-validator');
const { Booking, DiagnosticTest, DiagnosticCentre, Payment } = require('../models');
const logger = require('../utils/logger');

/**
 * POST /api/bookings
 * Create a new booking for the authenticated user.
 */
const createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { test_id, centre_id, appointment_date, appointment_time, notes } = req.body;

    // Validate that the centre exists and is active
    const centre = await DiagnosticCentre.findByPk(centre_id);
    if (!centre || !centre.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic centre not found or inactive.',
      });
    }

    // Validate that the test exists, is active, and belongs to the specified centre
    const test = await DiagnosticTest.findOne({
      where: { id: test_id, centre_id, is_active: true },
    });
    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic test not found at the specified centre.',
      });
    }

    // Validate appointment date is not in the past
    const appointmentDate = new Date(appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date cannot be in the past.',
      });
    }

    const booking = await Booking.create({
      user_id: req.user.id,
      test_id,
      centre_id,
      appointment_date,
      appointment_time,
      amount: test.price,
      status: 'PENDING',
      notes,
    });

    // Re-fetch with associations for the response
    const fullBooking = await Booking.findByPk(booking.id, {
      include: [
        { model: DiagnosticTest, as: 'test', attributes: ['id', 'name', 'price'] },
        { model: DiagnosticCentre, as: 'centre', attributes: ['id', 'name', 'city'] },
      ],
    });

    logger.info(`Booking created: ${booking.id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully. Proceed to payment.',
      data: { booking: fullBooking },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings
 * List bookings for the authenticated user with pagination.
 */
const listBookings = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.id };

    // Optional status filter
    if (req.query.status && Booking.STATUSES.includes(req.query.status.toUpperCase())) {
      where.status = req.query.status.toUpperCase();
    }

    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { model: DiagnosticTest, as: 'test', attributes: ['id', 'name', 'price'] },
        { model: DiagnosticCentre, as: 'centre', attributes: ['id', 'name', 'city'] },
        { model: Payment, as: 'payments', attributes: ['id', 'status', 'transaction_id', 'amount'] },
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']],
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        bookings: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/:id
 * Get a single booking by ID (must belong to the authenticated user).
 */
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.user.id },
      include: [
        { model: DiagnosticTest, as: 'test', attributes: ['id', 'name', 'price', 'description'] },
        { model: DiagnosticCentre, as: 'centre', attributes: ['id', 'name', 'address', 'city'] },
        { model: Payment, as: 'payments', attributes: ['id', 'status', 'transaction_id', 'amount', 'processed_at'] },
      ],
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    res.json({ success: true, data: { booking } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 * Cancel a booking (only PENDING bookings can be cancelled).
 */
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a booking with status "${booking.status}". Only PENDING bookings can be cancelled.`,
      });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    logger.info(`Booking cancelled: ${booking.id} by user ${req.user.id}`);

    res.json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, listBookings, getBooking, cancelBooking };
