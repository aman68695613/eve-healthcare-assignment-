const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DiagnosticTest = sequelize.define('DiagnosticTest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Test name is required' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: { msg: 'Price must be a valid decimal number' },
      min: { args: [0], msg: 'Price must be non-negative' },
    },
  },
  centre_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'diagnostic_centres',
      key: 'id',
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'diagnostic_tests',
});

module.exports = DiagnosticTest;
