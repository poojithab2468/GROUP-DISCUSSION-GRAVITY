const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const mongoose = require('mongoose');

// In-memory fallback cache in case MongoDB is offline
const memoryReports = new Map();
const memoryBadges = new Map();

// POST /api/reports - Save or update report
router.post('/', async (req, res) => {
  try {
    const { sessionId, roomId, topic, category, reportText, metrics, participantsData } = req.body;
    const identifier = sessionId || roomId || `report_${Date.now()}`;

    const reportData = {
      sessionId: sessionId || identifier,
      roomId: roomId || '',
      topic: topic || 'GD Session',
      category: category || 'General',
      reportText: reportText || '',
      metrics: metrics || {},
      participantsData: participantsData || [],
      createdAt: new Date()
    };

    // Store in-memory fallback
    memoryReports.set(identifier, reportData);

    // If MongoDB is connected, persist to DB
    if (mongoose.connection.readyState === 1) {
      const existing = await Report.findOne({
        $or: [
          { sessionId: identifier },
          { roomId: identifier }
        ]
      });

      if (existing) {
        existing.topic = reportData.topic;
        existing.category = reportData.category;
        existing.reportText = reportData.reportText;
        existing.metrics = reportData.metrics;
        existing.participantsData = reportData.participantsData;
        await existing.save();
        return res.status(200).json({ success: true, message: 'Report updated in MongoDB', report: existing });
      } else {
        const newReport = new Report(reportData);
        await newReport.save();
        return res.status(201).json({ success: true, message: 'Report saved to MongoDB', report: newReport });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Report saved locally (MongoDB currently disconnected)',
      report: reportData
    });
  } catch (error) {
    console.error('[Report API] Save report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/:id - Retrieve report by sessionId or roomId
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const report = await Report.findOne({
        $or: [
          { sessionId: id },
          { roomId: id }
        ]
      });
      if (report) {
        return res.status(200).json({ success: true, report });
      }
    }

    if (memoryReports.has(id)) {
      return res.status(200).json({ success: true, report: memoryReports.get(id) });
    }

    return res.status(404).json({ success: false, error: 'Report not found' });
  } catch (error) {
    console.error('[Report API] Get report error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports - List all reports
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const reports = await Report.find().sort({ createdAt: -1 }).limit(50);
      return res.status(200).json({ success: true, reports });
    }

    const reports = Array.from(memoryReports.values());
    return res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error('[Report API] List reports error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/reports/badges - Save unlocked badges for a user or session
router.post('/badges', async (req, res) => {
  try {
    const { userEmail, sessionId, badges } = req.body;
    const key = userEmail || sessionId || 'default_user';

    const current = memoryBadges.get(key) || new Set();
    if (Array.isArray(badges)) {
      badges.forEach(b => current.add(b));
    }
    memoryBadges.set(key, current);

    return res.status(200).json({
      success: true,
      message: 'Badges saved successfully',
      badges: Array.from(current)
    });
  } catch (error) {
    console.error('[Report API] Save badges error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/badges/:key - Retrieve badges
router.get('/badges/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const badges = memoryBadges.has(key) ? Array.from(memoryBadges.get(key)) : [];
    return res.status(200).json({ success: true, badges });
  } catch (error) {
    console.error('[Report API] Get badges error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
