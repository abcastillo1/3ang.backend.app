import { validateField } from './validator.js';

/**
 * `data.engagementFileTemplateId`: omitir | número (id en BD) | `"system"` (solo lectura / apply).
 */
export function validateOptionalEngagementFileTemplateId(fieldPath = 'data.engagementFileTemplateId') {
  return validateField(fieldPath)
    .optional({ nullable: true })
    .custom(value => {
      if (value === undefined || value === null || value === '') return true;
      if (value === 'system') return true;
      const n = parseInt(String(value), 10);
      return !Number.isNaN(n) && n >= 1;
    })
    .withMessage('validators.engagementFileTemplateId.invalid');
}
