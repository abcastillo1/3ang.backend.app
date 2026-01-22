import { body, query, param } from 'express-validator';

export function validateField(field) {
  if (field.startsWith('query.')) {
    return query(field.replace('query.', ''));
  }
  if (field.startsWith('param.')) {
    return param(field.replace('param.', ''));
  }
  return body(field);
}
