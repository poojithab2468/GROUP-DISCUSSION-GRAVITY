const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  roomId: { type: String, default: '' },
  sessionId: { type: String, default: '' },
  topic: { type: String, default: '' },
  category: { type: String, default: '' },
  reportText: { type: String, default: '' },
  metrics: { type: Object, default: {} },
  participantsData: [
    {
      userId: String,
      name: String,
      totalSpeakingTimeMs: Number,
      contributionPercentage: Number,
      aiFeedback: Object, 
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
