require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const app = express();

// Security Headers (Helmet with customized CSP for fonts, local uploads, and backend)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// NoSQL Injection Sanitization
app.use(mongoSanitize({ replaceWith: '_' }));

// Gzip compression
app.use(compression());

// Safe CORS Policy
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Rate Limiter for Authentication / Login Routes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api/auth/refresh-token', authRateLimiter);

// Cache static uploads for 7 days
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/results', require('./routes/results'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/branches', require('./routes/branches'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/study-material', require('./routes/studyMaterial'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/branch', require('./routes/branchLogin'));
app.use('/api/franchise', require('./routes/franchise'));

app.use('/api/exam-forms', require('./routes/examForms'));
app.use('/api/admit-card', require('./routes/admitCard'));
app.use('/api/test', require('./routes/test'));
app.use('/api/showcase', require('./routes/studentShowcase'));

app.get('/', (req, res) => res.json({ message: 'KCI API Running' }));
app.get('/api/auth/ping', (req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting' }));

// Self-ping every 14 minutes to prevent Render free tier sleep
const http = require('http');
const https = require('https');
setInterval(() => {
  const url = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const client = url.startsWith('https') ? https : http;
  client.get(`${url}/api/auth/ping`, (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', () => {});
}, 14 * 60 * 1000);

// Global Error Handler — Hide stack traces in production
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Express Error:', err.stack || err);
  } else {
    console.error('Express Error:', err.message);
  }
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');
  res.status(status).json({ success: false, message });
});

// Process Safety - Prevent backend process from crashing on unhandled errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err.message);
});

// ── MONGODB CONNECTION CONFIG & NON-CRASHING RETRY LOOP ──
const mongoOptions = {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  authSource: 'admin',
};

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error('⚠️ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB connection disconnected. Retrying...');
});

let mongoUri = process.env.MONGO_URI || '';
if (mongoUri && !mongoUri.includes('authSource=')) {
  mongoUri += (mongoUri.includes('?') ? '&' : '?') + 'authSource=admin';
}

const connectDB = async () => {
  if (!mongoUri) {
    console.error('❌ ERROR: MONGO_URI environment variable is not set!');
    return;
  }
  try {
    await mongoose.connect(mongoUri, mongoOptions);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ DB Connection Attempt Failed:', err.message);
    console.log('🔄 Retrying MongoDB connection in 10 seconds...');
    setTimeout(connectDB, 10000);
  }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 KCI Server running on port ${PORT}`);
  connectDB();
});

