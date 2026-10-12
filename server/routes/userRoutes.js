const express = require('express');
const router = express.Router();
const User = require('../models/User');
const mongoose = require('mongoose');

// In-memory fallback cache in case MongoDB is temporarily offline
const memoryUsers = new Map();

// GET /api/users/profile/:email - Get user profile
router.get('/profile/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email });
      if (user) {
        return res.status(200).json({ success: true, user });
      }
    }

    if (memoryUsers.has(email)) {
      return res.status(200).json({ success: true, user: memoryUsers.get(email) });
    }

    return res.status(404).json({ success: false, message: 'User profile not found' });
  } catch (error) {
    console.error('[User API] Get profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/users/profile - Create or update user profile
router.post('/profile', async (req, res) => {
  try {
    const { email, name, bio, avatarUrl, targetRole, college } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const profileData = {
      email: cleanEmail,
      name: name || 'Fluent Learner',
      bio: bio || '',
      avatarUrl: avatarUrl || '',
      targetRole: targetRole || 'Placement Aspirant',
      college: college || 'Engineering Graduate',
      updatedAt: new Date()
    };

    // Store in-memory cache
    memoryUsers.set(cleanEmail, profileData);

    // If MongoDB is connected, persist to DB
    if (mongoose.connection.readyState === 1) {
      const updatedUser = await User.findOneAndUpdate(
        { email: cleanEmail },
        { $set: profileData },
        { new: true, upsert: true }
      );
      return res.status(200).json({
        success: true,
        message: 'Profile saved to database successfully',
        user: updatedUser
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile saved locally (database fallback)',
      user: profileData
    });
  } catch (error) {
    console.error('[User API] Save profile error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
