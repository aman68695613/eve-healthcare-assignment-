const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const {
  listCentres,
  getCentre,
  createCentre,
  addTest,
  listTestsByCentre,
} = require('../controllers/centreController');

const router = express.Router();

/**
 * @swagger
 * /api/centres:
 *   get:
 *     summary: List all diagnostic centres
 *     tags: [Centres]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of diagnostic centres with their tests
 */
router.get('/', listCentres);

/**
 * @swagger
 * /api/centres/{id}:
 *   get:
 *     summary: Get a single diagnostic centre
 *     tags: [Centres]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Diagnostic centre details
 *       404:
 *         description: Centre not found
 */
router.get('/:id', getCentre);

/**
 * @swagger
 * /api/centres:
 *   post:
 *     summary: Create a new diagnostic centre
 *     tags: [Centres]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address, city, state]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Apollo Diagnostics
 *               address:
 *                 type: string
 *                 example: 123 MG Road
 *               city:
 *                 type: string
 *                 example: Mumbai
 *               state:
 *                 type: string
 *                 example: Maharashtra
 *               pincode:
 *                 type: string
 *                 example: "400001"
 *               phone:
 *                 type: string
 *                 example: "022-12345678"
 *     responses:
 *       201:
 *         description: Centre created
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Centre name is required'),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('pincode').optional().trim(),
    body('phone').optional().trim(),
  ],
  createCentre
);

/**
 * @swagger
 * /api/centres/{centreId}/tests:
 *   get:
 *     summary: List tests for a specific centre
 *     tags: [Centres]
 *     parameters:
 *       - in: path
 *         name: centreId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: List of tests
 *       404:
 *         description: Centre not found
 */
router.get('/:centreId/tests', listTestsByCentre);

/**
 * @swagger
 * /api/centres/{centreId}/tests:
 *   post:
 *     summary: Add a diagnostic test to a centre
 *     tags: [Centres]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: centreId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Complete Blood Count (CBC)
 *               description:
 *                 type: string
 *                 example: Comprehensive blood test measuring RBC, WBC, platelets
 *               price:
 *                 type: number
 *                 example: 500.00
 *     responses:
 *       201:
 *         description: Test added to centre
 *       404:
 *         description: Centre not found
 */
router.post(
  '/:centreId/tests',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('Test name is required'),
    body('description').optional().trim(),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  ],
  addTest
);

module.exports = router;
