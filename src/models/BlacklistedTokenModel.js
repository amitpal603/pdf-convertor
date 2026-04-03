const mongoose = require('mongoose');

const blacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true, // Index for faster lookups
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true
});

// Configure TTL index for automatic deletion of tokens after expiresAt
blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlacklistedToken = mongoose.model('BlacklistedToken', blacklistedTokenSchema);

module.exports = BlacklistedToken;
