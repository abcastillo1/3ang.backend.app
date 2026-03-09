import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { storageService } from '../../../helpers/storage.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_CATEGORIES = ['audit_evidences', 'fiscal_reports', 'company_docs', 'profiles'];

export const validators = [
  validateField('data.name')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.mimeType')
    .notEmpty()
    .withMessage('validators.mimeType.required')
    .isIn([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'image/jpeg',
      'image/png',
      'image/webp'
    ])
    .withMessage('files.mimeType.invalid'),
  validateField('data.size')
    .notEmpty()
    .withMessage('validators.size.required')
    .isInt({ min: 1, max: 40 * 1024 * 1024 })
    .withMessage('files.size.exceeded'),
  validateField('data.category')
    .notEmpty()
    .withMessage('files.category.required')
    .isIn(ALLOWED_CATEGORIES)
    .withMessage('files.category.invalid'),
  validateField('data.auditCaseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.auditCaseId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('files.upload')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;

  const ext = path.extname(data.name) || '';
  const uniqueName = `${uuidv4()}${ext}`;
  const caseSegment = data.auditCaseId ? String(data.auditCaseId) : 'general';
  const key = `${user.organizationId}/${data.category}/${caseSegment}/${uniqueName}`;

  const { uploadUrl, key: storageKey, expiresIn } = await storageService.generateUploadUrl(
    key,
    data.mimeType
  );

  const response = {
    uploadUrl,
    key: storageKey,
    expiresIn,
    contentType: data.mimeType
  };

  return apiResponse(res, req, next)(response);
}

const uploadUrlRoute = {
  validators,
  default: handler,
  action: 'upload-url',
  entity: 'files'
};

export default uploadUrlRoute;
