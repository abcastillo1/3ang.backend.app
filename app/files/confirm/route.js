import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { storageService } from '../../../helpers/storage.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';

const ALLOWED_CATEGORIES = ['audit_evidences', 'fiscal_reports', 'company_docs', 'profiles'];

export const validators = [
  validateField('data.key')
    .notEmpty()
    .withMessage('validators.key.required')
    .isLength({ max: 512 })
    .withMessage('validators.key.invalid'),
  validateField('data.originalName')
    .notEmpty()
    .withMessage('validators.name.required')
    .isLength({ max: 255 })
    .withMessage('validators.name.invalid'),
  validateField('data.mimeType')
    .notEmpty()
    .withMessage('validators.mimeType.required'),
  validateField('data.size')
    .notEmpty()
    .withMessage('validators.size.required')
    .isInt({ min: 0 }),
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

/**
 * Confirms that a file was uploaded to the presigned URL and optionally
 * persists metadata (e.g. audit_documents). Key must belong to user's organization.
 */
async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;

  const key = data.key.trim();
  const expectedPrefix = `${user.organizationId}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw throwError(HTTP_STATUS.FORBIDDEN, 'files.confirm.forbidden');
  }

  const downloadUrl = await storageService.generateDownloadUrl(key);

  const document = {
    key,
    originalName: data.originalName,
    mimeType: data.mimeType,
    size: data.size,
    category: data.category,
    auditCaseId: data.auditCaseId || null,
    uploaderId: user.id,
    organizationId: user.organizationId,
    downloadUrl,
    analysisStatus: 'pending'
  };

  // TODO: persist to audit_documents when model/table exists; enqueue IA via helpers/ai-analyst.js
  const response = {
    document
  };

  return apiResponse(res, req, next)(response);
}

export default handler;
