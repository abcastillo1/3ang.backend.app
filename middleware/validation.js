import { validationResult } from 'express-validator';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { createError } from '../helpers/errors.js';

export default function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorFields = {};
    
    errors.array().forEach(err => {
      const field = err.path || err.param || 'unknown';
      if (!errorFields[field]) {
        errorFields[field] = [];
      }
      errorFields[field].push(err.msg);
    });
    
    throw createError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, errorFields);
  }
  
  next();
}
