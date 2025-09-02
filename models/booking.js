const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String, // optional but handy for quick access
    required: true
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'listing',
    required: true
  },
  bookedDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
