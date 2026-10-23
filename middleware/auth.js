const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ success: false, message: 'Server misconfiguration: JWT_SECRET not set' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User no longer exists' });
    if (user.isActive === false) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }
    // Instant token revocation check
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Token revoked. Session invalidated, please login again.' });
    }
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired, please login again' : 'Token invalid';
    res.status(401).json({ success: false, message: msg });
  }
};

exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ success: false, message: 'Admin access required' });
};

// Super Admin: only admin with isSuperAdmin flag OR the primary admin account
exports.superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin' && (req.user.isSuperAdmin || req.user.email === process.env.SUPER_ADMIN_EMAIL)) return next();
  res.status(403).json({ success: false, message: 'Super Admin access required for this action' });
};

// Branch manager or admin
exports.branchOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'branch')) return next();
  res.status(403).json({ success: false, message: 'Branch Manager or Admin access required' });
};

// Staff, branch, franchise, or admin
exports.staffOrAbove = (req, res, next) => {
  const allowed = ['admin', 'branch', 'franchise', 'teacher'];
  if (req.user && allowed.includes(req.user.role)) return next();
  res.status(403).json({ success: false, message: 'Staff access required' });
};

// Counsellor = teacher role alias
exports.counsellor = (req, res, next) => {
  const allowed = ['admin', 'branch', 'franchise', 'teacher'];
  if (req.user && allowed.includes(req.user.role)) return next();
  res.status(403).json({ success: false, message: 'Counsellor access required' });
};
