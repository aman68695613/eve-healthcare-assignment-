const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED'];

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bookings',
      key: 'id',
    },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(...PAYMENT_STATUSES),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  transaction_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  payment_method: {
    type: DataTypes.STRING(50),
    defaultValue: 'SIMULATED',
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'payments',
});

Payment.STATUSES = PAYMENT_STATUSES;

module.exports = Payment;
