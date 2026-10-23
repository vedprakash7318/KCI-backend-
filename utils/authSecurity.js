const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Hash token with SHA-256 for secure database storage
const hashToken = (token) => {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

// Extract client IP safely
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

// Human-friendly user agent parser
const parseDevice = (userAgent) => {
  const ua = String(userAgent || '');
  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return `${browser} on ${os}`;
};

// Generate Access Token (15 minutes) and Refresh Token (30 days)
const issueTokens = async (user, req) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured on server');
  }

  const tokenVersion = user.tokenVersion || 0;
  const accessToken = jwt.sign(
    { id: user._id, role: user.role, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const rawRefreshToken = crypto.randomBytes(48).toString('base64url');
  const refreshTokenHash = hashToken(rawRefreshToken);

  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const device = parseDevice(userAgent);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await Session.create({
    userId: user._id,
    refreshTokenHash,
    tokenVersion,
    ip,
    userAgent,
    device,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
};

// Refresh Token Rotation (RTR) with Reuse Detection
const rotateRefreshToken = async (rawRefreshToken, req) => {
  if (!rawRefreshToken) {
    const error = new Error('Refresh token is required');
    error.status = 400;
    throw error;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ refreshTokenHash: tokenHash });

  if (!session) {
    const error = new Error('Invalid or non-existent refresh token');
    error.status = 401;
    throw error;
  }

  // 🚨 SUSPICIOUS: Token reuse detection!
  // If a revoked refresh token is presented again, an attacker may have stolen the token!
  if (session.isRevoked) {
    // Invalidate all active sessions for this user immediately
    await Session.updateMany(
      { userId: session.userId, isRevoked: false },
      { isRevoked: true, revokedReason: 'TOKEN_REUSE_DETECTED' }
    );

    // Bump tokenVersion so all existing access tokens also immediately fail
    await User.findByIdAndUpdate(session.userId, { $inc: { tokenVersion: 1 } });

    // Log critical security event
    try {
      const user = await User.findById(session.userId);
      await AuditLog.create({
        action: 'TOKEN_THEFT_DETECTED',
        performedBy: session.userId,
        performedByName: user?.name || 'Unknown',
        performedByRole: user?.role || 'student',
        targetId: session.userId,
        targetModel: 'User',
        details: {
          reason: 'Revoked refresh token was presented again. All sessions terminated.',
          originalRevocationReason: session.revokedReason,
        },
        ip: getClientIp(req),
      });
    } catch (_) {}

    const error = new Error('Security Alert: Compromised session detected. All sessions terminated. Please log in again.');
    error.status = 403;
    throw error;
  }

  // Check expiration
  if (session.expiresAt && session.expiresAt < new Date()) {
    const error = new Error('Refresh token has expired. Please log in again.');
    error.status = 401;
    throw error;
  }

  // Fetch and validate user
  const user = await User.findById(session.userId);
  if (!user || user.isActive === false) {
    const error = new Error('User account is inactive or not found');
    error.status = 401;
    throw error;
  }

  if (user.tokenVersion !== session.tokenVersion) {
    const error = new Error('Session has been revoked. Please log in again.');
    error.status = 401;
    throw error;
  }

  // Rotate: Invalidate old session
  session.isRevoked = true;
  session.revokedReason = 'TOKEN_ROTATION';
  session.lastUsedAt = new Date();
  await session.save();

  // Issue brand new access token + refresh token
  const tokens = await issueTokens(user, req);

  return {
    ...tokens,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role === 'franchise' ? 'branch' : user.role,
      rollNumber: user.rollNumber,
      enrollmentNumber: user.enrollmentNumber,
      branchId: user.branchId,
      branchName: user.branchName,
    },
  };
};

// Revoke a single refresh token session on logout
const revokeRefreshToken = async (rawRefreshToken, reason = 'LOGOUT') => {
  if (!rawRefreshToken) return false;
  const tokenHash = hashToken(rawRefreshToken);
  const session = await Session.findOne({ refreshTokenHash: tokenHash });
  if (session && !session.isRevoked) {
    session.isRevoked = true;
    session.revokedReason = reason;
    await session.save();
    return true;
  }
  return false;
};

// Revoke all sessions for a user (logout all devices / password change)
const revokeAllUserSessions = async (userId, reason = 'LOGOUT_ALL') => {
  await Session.updateMany(
    { userId, isRevoked: false },
    { isRevoked: true, revokedReason: reason }
  );
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};

// Check if user account is locked due to excessive failed attempts
const checkAccountLock = (user) => {
  if (user.lockUntil && user.lockUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    const error = new Error(`Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`);
    error.status = 423; // Locked
    throw error;
  }
};

// Record failed login attempt and lock if threshold exceeded
const recordFailedLogin = async (user, req) => {
  if (!user) return;
  user.loginAttempts = (user.loginAttempts || 0) + 1;

  if (user.loginAttempts >= 5) {
    user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
    try {
      await AuditLog.create({
        action: 'ACCOUNT_LOCKED',
        performedBy: user._id,
        performedByName: user.name,
        performedByRole: user.role,
        targetId: user._id,
        targetModel: 'User',
        details: { attempts: user.loginAttempts, lockDurationMinutes: 15 },
        ip: getClientIp(req),
      });
    } catch (_) {}
  }

  await user.save({ validateBeforeSave: false });
};

// Record successful login and detect suspicious login indicators
const recordSuccessfulLogin = async (user, req) => {
  const currentIp = getClientIp(req);
  const currentUserAgent = req.headers['user-agent'] || 'unknown';

  let isSuspicious = false;
  const reasons = [];

  // If user previously logged in from a different IP and different device
  if (user.lastLoginIp && user.lastLoginIp !== currentIp && user.lastLoginUserAgent && user.lastLoginUserAgent !== currentUserAgent) {
    isSuspicious = true;
    reasons.push('New IP and new device detected');
  }

  if (isSuspicious) {
    user.suspiciousLoginsCount = (user.suspiciousLoginsCount || 0) + 1;
    try {
      await AuditLog.create({
        action: 'SUSPICIOUS_LOGIN',
        performedBy: user._id,
        performedByName: user.name,
        performedByRole: user.role,
        targetId: user._id,
        targetModel: 'User',
        details: {
          reasons,
          previousIp: user.lastLoginIp,
          currentIp,
          previousUserAgent: user.lastLoginUserAgent,
          currentUserAgent,
        },
        ip: currentIp,
      });
    } catch (_) {}
  }

  // Reset login attempt counters on successful authentication
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLogin = new Date();
  user.lastLoginIp = currentIp;
  user.lastLoginUserAgent = currentUserAgent;

  await user.save({ validateBeforeSave: false });

  return { isSuspicious, reasons };
};

module.exports = {
  hashToken,
  getClientIp,
  parseDevice,
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  checkAccountLock,
  recordFailedLogin,
  recordSuccessfulLogin,
};

