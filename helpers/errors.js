import { HTTP_STATUS } from '../config/constants.js';

export function createError(status, code, errors = null) {
  const error = new Error();
  error.status = status;
  error.code = code;
  error.message = code || (errors && typeof errors === 'object' ? 'Validation failed' : String(errors)) || 'Error';
  if (errors) {
    error.errors = errors;
  }
  return error;
}

export function throwError(status, code, errors = null) {
  throw createError(status, code, errors);
}
