import multer from 'multer';
import { throwError } from '../../helpers/errors.js';
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
  [FILE_CATEGORIES.DOCUMENTS]: ['application/pdf', 'image/jpeg', 'image/png'],
  [FILE_CATEGORIES.INVENTORY]: ['image/jpeg', 'image/png', 'image/webp'],
  [FILE_CATEGORIES.ESTABLISHMENTS]: ['image/jpeg', 'image/png', 'image/webp']
};

// Max file sizes by category (in bytes)
const MAX_FILE_SIZES = {
  [FILE_CATEGORIES.PROFILES]: 5 * 1024 * 1024, // 5MB
  [FILE_CATEGORIES.DOCUMENTS]: 10 * 1024 * 1024, // 10MB
  [FILE_CATEGORIES.INVENTORY]: 5 * 1024 * 1024, // 5MB
  [FILE_CATEGORIES.ESTABLISHMENTS]: 5 * 1024 * 1024 // 5MB
};

const fileFilter = (req, file, cb) => {

  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype === 'application/pdf';
  
  if (!isImage && !isPdf) {
    return cb(throwError(HTTP_STATUS.BAD_REQUEST, 'files.mimeType.invalid'));
  }


  const maxSize = 10 * 1024 * 1024; //10MB limite global
  if (file.size && file.size > maxSize) {
    return cb(throwError(HTTP_STATUS.BAD_REQUEST, 'files.size.exceeded'));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 //10MB limite global
  }
});

export function validateFileUpload(req, res, next) {
  const files = req.files || (req.file ? [req.file] : []);

  console.log('files', files);
  
  if (!files || files.length === 0) {
    return next(throwError(HTTP_STATUS.BAD_REQUEST, 'files.file.required'));
  }

  const category = req.body.category;
  if (!category) {
    return next(throwError(HTTP_STATUS.BAD_REQUEST, 'files.category.required'));
  }

  for (const file of files) {
    const allowedTypes = ALLOWED_MIME_TYPES[category] || [];
    if (!allowedTypes.includes(file.mimetype)) {
      return next(throwError(HTTP_STATUS.BAD_REQUEST, 'files.mimeType.invalid'));
    }

    const maxSize = MAX_FILE_SIZES[category] || 5 * 1024 * 1024;
    if (file.size && file.size > maxSize) {
      return next(throwError(HTTP_STATUS.BAD_REQUEST, 'files.size.exceeded'));
    }
  }
  next();
}
