const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`🚀 EVE Healthcare API running on port ${PORT}`);
      logger.info(`📄 Swagger docs: http://localhost:${PORT}/api-docs`);
      logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
