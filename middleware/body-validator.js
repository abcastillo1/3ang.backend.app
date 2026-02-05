import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { throwError } from '../helpers/errors.js';

const EXCLUDED_ROUTES = [
  '/api/v1/files/upload'
];

export default function bodyValidator(req, res, next) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }

  const path = req.path || req.url.split('?')[0];
  if (EXCLUDED_ROUTES.includes(path)) {
    return next();
  }

  if (!req.body || typeof req.body !== 'object') {
    throwError(HTTP_STATUS.BAD_REQUEST, 'validation.body.invalid');
  }

  if (!req.body.data || typeof req.body.data !== 'object') {
    throwError(HTTP_STATUS.BAD_REQUEST, 'validation.body.dataRequired');
  }

  next();
}
