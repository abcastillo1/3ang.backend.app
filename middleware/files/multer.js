import multer from 'multer';
import { throwError, createError } from '../../helpers/errors.js';
import { HTTP_STATUS } from '../../config/constants.js';

// In-memory storage (files are processed immediately and not saved to disk)
const storage = multer.memoryStorage();

// File categories allowed
export const FILE_CATEGORIES = {
  PROFILES: 'profiles',
  DOCUMENTS: 'documents',
  INVENTORY: 'inventory',
  ESTABLISHMENTS: 'establishments'
};

// MIME types allowed by category
const ALLOWED_MIME_TYPES = {
  [FILE_CATEGORIES.PROFILES]: ['image/jpeg', 'image/png', 'image/webp'],
  [FILE_CATEGORIES.DOCUMENTS]: ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4'],
  [FILE_CATEGORIES.INVENTORY]: ['image/jpeg', 'image/png', 'image/webp'],
  [FILE_CATEGORIES.ESTABLISHMENTS]: ['image/jpeg', 'image/png', 'image/webp']
};

// Global file size limit (in bytes)
const GLOBAL_MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB

// Max file sizes by category (in bytes)
const MAX_FILE_SIZES = {
  [FILE_CATEGORIES.PROFILES]: 5 * 1024 * 1024, // 5MB
  [FILE_CATEGORIES.DOCUMENTS]: 40 * 1024 * 1024, // 40MB
  [FILE_CATEGORIES.INVENTORY]: 5 * 1024 * 1024, // 5MB
  [FILE_CATEGORIES.ESTABLISHMENTS]: 5 * 1024 * 1024 // 5MB
};

const fileFilter = (req, file, cb) => {

  const allAllowedTypes = new Set();
  Object.values(ALLOWED_MIME_TYPES).forEach(types => {
    types.forEach(type => allAllowedTypes.add(type));
  });
  

  if (!allAllowedTypes.has(file.mimetype)) {
    return cb(createError(HTTP_STATUS.BAD_REQUEST, 'files.mimeType.invalid'));
  }

  if (file.size && file.size > GLOBAL_MAX_FILE_SIZE) {
    return cb(createError(HTTP_STATUS.BAD_REQUEST, 'files.size.exceeded'));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: GLOBAL_MAX_FILE_SIZE
  }
});

export function validateFileUpload(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);
  
  if (!files || files.length === 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.file.required');
  }

  const category = req.body.category;
  if (!category) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.category.required');
  }

  if (!Object.values(FILE_CATEGORIES).includes(category)) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.category.invalid');
  }

  for (const file of files) {
    const allowedTypes = ALLOWED_MIME_TYPES[category] || [];
    if (!allowedTypes.includes(file.mimetype)) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.mimeType.invalid');
    }

    const maxSize = MAX_FILE_SIZES[category] || 5 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.size.exceeded');
    }
  }
  next();
}
