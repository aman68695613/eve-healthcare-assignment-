const { validationResult } = require('express-validator');
const { DiagnosticCentre, DiagnosticTest } = require('../models');
const logger = require('../utils/logger');

/**
 * GET /api/centres
 * List all diagnostic centres with pagination.
 */
const listCentres = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;

    const { count, rows } = await DiagnosticCentre.findAndCountAll({
      where: { is_active: true },
      include: [
        {
          model: DiagnosticTest,
          as: 'tests',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'name', 'description', 'price'],
        },
      ],
      limit,
      offset,
      order: [['name', 'ASC']],
      distinct: true,
    });

    res.json({
      success: true,
      data: {
        centres: rows,
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
 * GET /api/centres/:id
 * Get a single diagnostic centre by ID, including its tests.
 */
const getCentre = async (req, res, next) => {
  try {
    const centre = await DiagnosticCentre.findByPk(req.params.id, {
      include: [
        {
          model: DiagnosticTest,
          as: 'tests',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'name', 'description', 'price'],
        },
      ],
    });

    if (!centre || !centre.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic centre not found.',
      });
    }

    res.json({ success: true, data: { centre } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/centres
 * Create a new diagnostic centre.
 */
const createCentre = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, address, city, state, pincode, phone } = req.body;
    const centre = await DiagnosticCentre.create({ name, address, city, state, pincode, phone });

    logger.info(`Diagnostic centre created: ${centre.name} (${centre.id})`);

    res.status(201).json({
      success: true,
      message: 'Diagnostic centre created successfully',
      data: { centre },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/centres/:centreId/tests
 * Add a diagnostic test to a centre.
 */
const addTest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    const centre = await DiagnosticCentre.findByPk(req.params.centreId);
    if (!centre || !centre.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic centre not found.',
      });
    }

    const { name, description, price } = req.body;
    const test = await DiagnosticTest.create({
      name,
      description,
      price,
      centre_id: centre.id,
    });

    logger.info(`Diagnostic test added: ${test.name} to centre ${centre.name}`);

    res.status(201).json({
      success: true,
      message: 'Diagnostic test added successfully',
      data: { test },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/centres/:centreId/tests
 * List tests for a specific centre.
 */
const listTestsByCentre = async (req, res, next) => {
  try {
    const centre = await DiagnosticCentre.findByPk(req.params.centreId);
    if (!centre || !centre.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic centre not found.',
      });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const offset = (page - 1) * limit;

    const { count, rows } = await DiagnosticTest.findAndCountAll({
      where: { centre_id: centre.id, is_active: true },
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        centre: { id: centre.id, name: centre.name },
        tests: rows,
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

module.exports = { listCentres, getCentre, createCentre, addTest, listTestsByCentre };
