const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  socketId: { type: String },
  joinedAt: { type: Date, default: Date.now },
  totalSpeakingTimeMs: { type: Number, default: 0 },
});

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  topic: { type: String, required: true },
  maxParticipants: { type: Number, required: true, default: 5 },
  durationMinutes: { type: Number, required: true },
  status: { type: String, enum: ['waiting', 'active', 'completed'], default: 'waiting' },
  hostId: { type: String, required: true },
  participants: [participantSchema],
  startTime: { type: Date },
  endTime: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Room', roomSchema);
