const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  createBooking,
  listBookings,
  getBooking,
  cancelBooking,
} = require('../controllers/bookingController');

const router = express.Router();

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [test_id, centre_id, appointment_date, appointment_time]
 *             properties:
 *               test_id:
 *                 type: string
 *                 format: uuid
 *               centre_id:
 *                 type: string
 *                 format: uuid
 *               appointment_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-15"
 *               appointment_time:
 *                 type: string
 *                 example: "10:30"
 *               notes:
 *                 type: string
 *                 example: "Fasting required"
 *     responses:
 *       201:
 *         description: Booking created
 *       400:
 *         description: Validation error
 *       404:
 *         description: Test or centre not found
 */
router.post(
  '/',
  authenticate,
  [
    body('test_id')
      .notEmpty().withMessage('Test ID is required')
      .isUUID().withMessage('Test ID must be a valid UUID'),
    body('centre_id')
      .notEmpty().withMessage('Centre ID is required')
      .isUUID().withMessage('Centre ID must be a valid UUID'),
    body('appointment_date')
      .notEmpty().withMessage('Appointment date is required')
      .isDate().withMessage('Must be a valid date (YYYY-MM-DD)'),
    body('appointment_time')
      .notEmpty().withMessage('Appointment time is required')
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Must be a valid time (HH:MM)'),
    body('notes').optional().trim(),
  ],
  createBooking
);

/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: List bookings for the authenticated user
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, FAILED, CANCELLED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of bookings
 */
router.get('/', authenticate, listBookings);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get a single booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking details
 *       404:
 *         description: Booking not found
 */
router.get('/:id', authenticate, getBooking);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Booking cannot be cancelled
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/cancel', authenticate, cancelBooking);

module.exports = router;
