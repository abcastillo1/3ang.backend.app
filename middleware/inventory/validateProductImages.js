/**
 * Validates that image and gallery match the structure returned by the files/upload API.
 * Upload API returns per file: { path, originalName, mimeType, size, url, fileId }
 * - image: optional, must be one object of that shape (at least url)
 * - gallery: optional, must be array of such objects
 */
import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';

const UPLOAD_FILE_KEYS = ['path', 'originalName', 'mimeType', 'size', 'url', 'fileId'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidUploadFileShape(obj) {
  if (!isPlainObject(obj)) return false;
  if (typeof obj.url !== 'string' || obj.url.trim() === '') return false;
  const keys = Object.keys(obj);
  return keys.every((k) => UPLOAD_FILE_KEYS.includes(k));
}

export default function validateProductImages(req, res, next) {
  const { data } = req.body || {};
  if (!data) return next();

  if (data.image !== undefined && data.image !== null) {
    if (typeof data.image === 'string') {
      try {
        const parsed = JSON.parse(data.image);
        if (!isValidUploadFileShape(parsed)) {
          throw new Error('invalid');
        }
        req.body.data.image = parsed;
      } catch {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'validators.image.uploadFormatInvalid');
      }
    } else if (!isValidUploadFileShape(data.image)) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'validators.image.uploadFormatInvalid');
    }
  }

  if (data.gallery !== undefined && data.gallery !== null) {
    let gallery = data.gallery;
    if (typeof data.gallery === 'string') {
      try {
        gallery = JSON.parse(data.gallery);
      } catch {
        throw throwError(HTTP_STATUS.BAD_REQUEST, 'validators.gallery.uploadFormatInvalid');
      }
    }
    if (!Array.isArray(gallery)) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'validators.gallery.uploadFormatInvalid');
    }
    const allValid = gallery.every((item) => isValidUploadFileShape(item));
    if (!allValid) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'validators.gallery.uploadFormatInvalid');
    }
    req.body.data.gallery = gallery;
  }

  next();
}
