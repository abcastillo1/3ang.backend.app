import { validationResult } from 'express-validator';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

export default function validateRequest(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = new Error('Validation errors');
    error.status = HTTP_STATUS.BAD_REQUEST;
    error.code = ERROR_CODES.VALIDATION_ERROR;
    error.errors = {};
    
    errors.array().forEach(err => {
      const field = err.path || err.param || 'unknown';
      if (!error.errors[field]) {
        error.errors[field] = [];
      }
      error.errors[field].push(err.msg);
    });
    
    throw error;
  }
  
  next();
}
