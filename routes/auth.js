const router = require('express').Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  getStudentInfo,
  refreshToken,
  logout,
  logoutAll,
  getSessions,
  revokeSessionById,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { revokeAllUserSessions, issueTokens } = require('../utils/authSecurity');

// Public authentication routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/ping', (req, res) => res.json({ status: 'ok' }));
router.get('/student-info/:rollNumber', getStudentInfo);

// Protected session & profile routes
router.get('/me', protect, getMe);
router.post('/logout-all', protect, logoutAll);
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:sessionId', protect, revokeSessionById);
router.put('/profile', protect, upload.single('photo'), updateProfile);

// Password change with session revocation
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Revoke all prior sessions for this user
    await revokeAllUserSessions(user._id, 'PASSWORD_CHANGED');

    // Issue brand new tokens for the current session
    const tokens = await issueTokens(user, req);

    res.json({
      success: true,
      message: 'Password changed successfully. All other sessions have been logged out.',
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
