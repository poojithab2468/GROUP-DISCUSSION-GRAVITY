const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  targetRole: { type: String, default: 'Software Engineer' },
  college: { type: String, default: 'Engineering Graduate' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
