const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase ? safeBase + '-' : ''}${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext) || mime.startsWith('image/') || mime === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDFs allowed'));
  }
};

const baseMulter = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } });

const normalizePaths = (req) => {
  if (req.file) {
    const webPath = `/uploads/${req.file.filename}`;
    req.file.path = webPath;
    req.file.secure_url = webPath;
    req.file.url = webPath;
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach((f) => {
        const webPath = `/uploads/${f.filename}`;
        f.path = webPath;
        f.secure_url = webPath;
        f.url = webPath;
      });
    } else if (typeof req.files === 'object') {
      Object.values(req.files).forEach((arr) => {
        if (Array.isArray(arr)) {
          arr.forEach((f) => {
            const webPath = `/uploads/${f.filename}`;
            f.path = webPath;
            f.secure_url = webPath;
            f.url = webPath;
          });
        }
      });
    }
  }
};

module.exports = {
  single: (name) => (req, res, next) => {
    baseMulter.single(name)(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  array: (name, maxCount) => (req, res, next) => {
    baseMulter.array(name, maxCount)(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  fields: (fields) => (req, res, next) => {
    baseMulter.fields(fields)(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  any: () => (req, res, next) => {
    baseMulter.any()(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  none: () => baseMulter.none(),
};
