const express = require('express');
const router = express.Router();

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    // Placeholder response until you implement database interaction
    res.status(201).json({ 
      success: true, 
      data: {
        _id: 'new-user-id',
        name: req.body.name,
        email: req.body.email,
        role: req.body.role || 'user',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST /api/auth/login - Login a user
router.post('/login', async (req, res) => {
  try {
    // Placeholder response
    res.json({
      success: true,
      data: {
        user: {
          _id: 'user-id',
          name: 'Demo User',
          email: req.body.email,
          role: 'admin'
        },
        token: 'mock-jwt-token'
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    // Placeholder response
    res.json({
      success: true,
      data: {
        _id: 'user-id',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'admin',
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// POST /api/auth/logout - Logout user
router.post('/logout', async (req, res) => {
  try {
    // Placeholder response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

module.exports = router; 