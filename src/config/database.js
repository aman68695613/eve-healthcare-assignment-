require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const isTest = process.env.NODE_ENV === 'test';

let sequelize;

if (isTest) {
  // Use SQLite in-memory for tests — no PostgreSQL dependency needed
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'eve_healthcare',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
      },
    }
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync models (use migrations in production)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
