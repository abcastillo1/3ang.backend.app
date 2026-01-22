import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { throwError } from '../helpers/errors.js';

export default function bodyValidator(req, res, next) {
  if (req.method === 'GET' || req.method === 'DELETE') {
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
