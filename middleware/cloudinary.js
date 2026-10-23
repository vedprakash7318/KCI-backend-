const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Disk storage saving directly to backend/uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase ? safeBase + '-' : ''}${uniqueSuffix}${ext}`);
  },
});

// Normalize all req.file and req.files paths to /uploads/filename (web-friendly URL)
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
      Object.values(req.files).forEach((fileArr) => {
        if (Array.isArray(fileArr)) {
          fileArr.forEach((f) => {
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

const imageFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext) || mime.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (PNG, JPG, JPEG, WEBP) are accepted.'));
  }
};

const imageOrPdfFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'].includes(ext) || mime.startsWith('image/') || mime === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image files and PDFs are accepted.'));
  }
};

const documentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'];
  if (allowed.includes(ext) || file.mimetype) {
    cb(null, true);
  } else {
    cb(new Error('File format not supported.'));
  }
};

// Helper to create wrapper around multer instances with path normalization
const wrapMulter = (multerInstance) => ({
  single: (name) => (req, res, next) => {
    multerInstance.single(name)(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  array: (name, maxCount) => (req, res, next) => {
    multerInstance.array(name, maxCount)(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  fields: (fields) => (req, res, next) => {
    multerInstance.fields(fields)(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  any: () => (req, res, next) => {
    multerInstance.any()(req, res, (err) => {
      if (err) return next(err);
      normalizePaths(req);
      next();
    });
  },
  none: () => multerInstance.none(),
});

// 100% Local uploads to backend/uploads
const uploadStudent = wrapMulter(
  multer({ storage: diskStorage, fileFilter: imageOrPdfFilter, limits: { fileSize: 25 * 1024 * 1024 } })
);
const uploadStaff = wrapMulter(
  multer({ storage: diskStorage, fileFilter: imageOrPdfFilter, limits: { fileSize: 25 * 1024 * 1024 } })
);
const uploadDocument = wrapMulter(
  multer({ storage: diskStorage, fileFilter: documentFilter, limits: { fileSize: 50 * 1024 * 1024 } })
);
const uploadGeneral = wrapMulter(
  multer({ storage: diskStorage, fileFilter: documentFilter, limits: { fileSize: 50 * 1024 * 1024 } })
);
const uploadResultPng = wrapMulter(
  multer({ storage: diskStorage, fileFilter: imageFilter, limits: { fileSize: 25 * 1024 * 1024 } })
);
const uploadCertificatePng = wrapMulter(
  multer({ storage: diskStorage, fileFilter: imageFilter, limits: { fileSize: 25 * 1024 * 1024 } })
);
const uploadGallery = wrapMulter(
  multer({ storage: diskStorage, fileFilter: imageFilter, limits: { fileSize: 25 * 1024 * 1024 } })
);

// Fallback uploadToCloudinary that returns local URL if called
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  return file.path || `/uploads/${file.filename}`;
};

// Deletes file from local uploads directory
const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    const rawPath = fileUrl.split('?')[0];
    const filename = path.basename(rawPath);
    const targetFile = path.join(uploadsDir, filename);
    if (fs.existsSync(targetFile)) {
      fs.unlinkSync(targetFile);
    }
  } catch (err) {
    console.error('Error deleting local file:', err.message);
  }
};

// Mock cloudinary SDK so any direct reference won't break
const cloudinary = {
  uploader: {
    upload: async (file) => ({
      secure_url: typeof file === 'string' && file.startsWith('/uploads') ? file : `/uploads/${path.basename(file)}`,
    }),
    destroy: async () => ({ result: 'ok' }),
  },
  config: () => {},
};

module.exports = {
  uploadStudent,
  uploadStaff,
  uploadDocument,
  uploadGeneral,
  uploadResultPng,
  uploadCertificatePng,
  uploadGallery,
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinary,
  uploadsDir,
  diskStorage,
};
