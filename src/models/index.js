const User = require('./User');
const DiagnosticCentre = require('./DiagnosticCentre');
const DiagnosticTest = require('./DiagnosticTest');
const Booking = require('./Booking');
const Payment = require('./Payment');

// ─── Associations ────────────────────────────────────────────────

// DiagnosticCentre <-> DiagnosticTest  (one-to-many)
DiagnosticCentre.hasMany(DiagnosticTest, {
  foreignKey: 'centre_id',
  as: 'tests',
  onDelete: 'CASCADE',
});
DiagnosticTest.belongsTo(DiagnosticCentre, {
  foreignKey: 'centre_id',
  as: 'centre',
});

// User <-> Booking  (one-to-many)
User.hasMany(Booking, {
  foreignKey: 'user_id',
  as: 'bookings',
  onDelete: 'CASCADE',
});
Booking.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

// DiagnosticTest <-> Booking  (one-to-many)
DiagnosticTest.hasMany(Booking, {
  foreignKey: 'test_id',
  as: 'bookings',
  onDelete: 'RESTRICT',
});
Booking.belongsTo(DiagnosticTest, {
  foreignKey: 'test_id',
  as: 'test',
});

// DiagnosticCentre <-> Booking  (one-to-many)
DiagnosticCentre.hasMany(Booking, {
  foreignKey: 'centre_id',
  as: 'bookings',
  onDelete: 'RESTRICT',
});
Booking.belongsTo(DiagnosticCentre, {
  foreignKey: 'centre_id',
  as: 'centre',
});

// Booking <-> Payment  (one-to-many: a booking may have retried payments)
Booking.hasMany(Payment, {
  foreignKey: 'booking_id',
  as: 'payments',
  onDelete: 'CASCADE',
});
Payment.belongsTo(Booking, {
  foreignKey: 'booking_id',
  as: 'booking',
});

module.exports = {
  User,
  DiagnosticCentre,
  DiagnosticTest,
  Booking,
  Payment,
};
