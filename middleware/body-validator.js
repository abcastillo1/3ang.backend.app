import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

export default function bodyValidator(req, res, next) {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return next();
  }

  if (!req.body || typeof req.body !== 'object') {
    const error = new Error('Invalid body');
    error.status = HTTP_STATUS.BAD_REQUEST;
    error.code = 'validation.body.invalid';
    throw error;
  }

  if (!req.body.data || typeof req.body.data !== 'object') {
    const error = new Error('Body must contain a "data" object');
    error.status = HTTP_STATUS.BAD_REQUEST;
    error.code = 'validation.body.dataRequired';
    throw error;
  }

  next();
}
