const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'];

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  test_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'diagnostic_tests',
      key: 'id',
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
  appointment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: { msg: 'Must be a valid date' },
    },
  },
  appointment_time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: { msg: 'Amount must be a valid decimal' },
      min: { args: [0], msg: 'Amount must be non-negative' },
    },
  },
  status: {
    type: DataTypes.ENUM(...BOOKING_STATUSES),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'bookings',
});

Booking.STATUSES = BOOKING_STATUSES;

module.exports = Booking;
