const User = require('../models/User');
const Session = require('../models/Session');
const generateStudentNumbers = require('../utils/generateStudentNumbers');
const AuditLog = require('../models/AuditLog');
const {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  checkAccountLock,
  recordFailedLogin,
  recordSuccessfulLogin,
  getClientIp,
} = require('../utils/authSecurity');

// Register a new student
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const { rollNumber, enrollmentNumber, registrationNumber } = await generateStudentNumbers();

    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      rollNumber,
      enrollmentNumber,
      registrationNumber,
    });

    const tokens = await issueTokens(user, req);

    res.status(201).json({
      success: true,
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Login user with account lock protection, suspicious login detection, and session generation
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Provide email / roll number / phone / form number and password',
      });
    }

    const loginInput = String(email).trim();
    const loginInputLower = loginInput.toLowerCase();

    // Find by email, formNo, formNumber, rollNumber, enrollmentNumber, or phone
    const user = await User.findOne({
      $or: [
        { email: loginInputLower },
        { formNo: loginInput },
        { formNumber: loginInput },
        { rollNumber: loginInput },
        { enrollmentNumber: loginInput },
        { phone: loginInput },
      ],
    }).populate('course', 'title');

    // Account lockout check
    if (user) {
      try {
        checkAccountLock(user);
      } catch (lockErr) {
        return res.status(lockErr.status || 423).json({ success: false, message: lockErr.message });
      }
    }

    // Password verification
    if (!user || !(await user.matchPassword(password))) {
      if (user) {
        await recordFailedLogin(user, req);
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid login credentials. Please check your Roll Number/Email & Password.',
      });
    }

    // Role mismatch check
    if (role) {
      const actualRole = user.role === 'franchise' ? 'branch' : user.role;
      if (role !== actualRole) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    }

    if (!user.isApproved && user.role !== 'admin' && user.role !== 'student') {
      return res.status(401).json({
        success: false,
        message: 'Account not approved yet. Please wait for admin approval.',
      });
    }

    // Successful login: update security metrics and detect anomalies
    const { isSuspicious, reasons } = await recordSuccessfulLogin(user, req);

    // Issue new access and refresh tokens
    const tokens = await issueTokens(user, req);

    // Audit log
    try {
      await AuditLog.create({
        action: isSuspicious ? 'SUSPICIOUS_LOGIN' : 'LOGIN',
        performedBy: user._id,
        performedByName: user.name,
        performedByRole: user.role,
        targetId: user._id,
        targetModel: 'User',
        details: {
          email: user.email,
          isSuspicious,
          reasons: reasons || [],
        },
        ip: getClientIp(req),
      });
    } catch (_) {}

    res.json({
      success: true,
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      suspiciousLogin: isSuspicious,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role === 'franchise' ? 'branch' : user.role,
        rollNumber: user.rollNumber,
        enrollmentNumber: user.enrollmentNumber,
        registrationNumber: user.registrationNumber,
        photo: user.photo,
        courseName: user.courseName || user.course?.title || '',
        course: user.course,
        fatherName: user.fatherName,
        phone: user.phone,
        address: user.address,
        dob: user.dob,
        batch: user.batch,
        isApproved: user.isApproved,
        isActive: user.isActive,
        branchName: user.branchName || user.franchiseCenter,
        branchCity: user.branchCity || user.franchiseCity,
        branchCode: user.branchCode || user.franchiseCode,
        branchId: user.branchId,
        branchAddress: user.branchAddress || user.address,
        renewalDate: user.renewalDate || null,
        approvedAt: user.approvedAt || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Refresh Token Rotation (RTR)
exports.refreshToken = async (req, res) => {
  try {
    const rawToken = req.body.refreshToken || req.headers['x-refresh-token'];
    const result = await rotateRefreshToken(rawToken, req);
    res.json({
      success: true,
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    });
  } catch (err) {
    const status = err.status || 401;
    res.status(status).json({ success: false, message: err.message });
  }
};

// Revoke current session refresh token
exports.logout = async (req, res) => {
  try {
    const rawToken = req.body.refreshToken || req.headers['x-refresh-token'];
    if (rawToken) {
      await revokeRefreshToken(rawToken, 'USER_LOGOUT');
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Revoke all active sessions for current user (Logout All Devices)
exports.logoutAll = async (req, res) => {
  try {
    await revokeAllUserSessions(req.user._id, 'USER_LOGOUT_ALL_DEVICES');
    res.json({ success: true, message: 'Logged out from all devices successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all active sessions for current user
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, isRevoked: false })
      .select('device ip userAgent createdAt lastUsedAt')
      .sort('-lastUsedAt');
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Remotely terminate a specific session
exports.revokeSessionById = async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.sessionId, userId: req.user._id, isRevoked: false },
      { isRevoked: true, revokedReason: 'USER_REVOKED_SESSION' },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }
    res.json({ success: true, message: 'Session revoked successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('course', 'title duration');

    // Auto-fix existing branches with no renewalDate
    if (user.role === 'branch' && !user.renewalDate) {
      const base = user.approvedAt || user.createdAt || new Date();
      const renewal = new Date(base);
      renewal.setFullYear(renewal.getFullYear() + 1);
      user.renewalDate = renewal;
      if (!user.approvedAt) user.approvedAt = base;
      await user.save({ validateBeforeSave: false });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Public student info lookup
exports.getStudentInfo = async (req, res) => {
  try {
    const q = req.params.rollNumber;
    const student = await User.findOne({
      role: 'student',
      $or: [
        { rollNumber: q },
        { enrollmentNumber: q },
        { registrationNumber: q },
        { formNo: q },
      ],
    }).select('name email phone rollNumber enrollmentNumber registrationNumber formNo courseName batch fatherName dob address branchName branchCity isApproved');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found with this enrollment / roll number' });
    }
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update profile details
exports.updateProfile = async (req, res) => {
  try {
    const updates = { name: req.body.name, phone: req.body.phone, address: req.body.address };
    if (req.file) updates.photo = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
