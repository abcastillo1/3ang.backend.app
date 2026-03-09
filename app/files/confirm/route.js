import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { storageService } from '../../../helpers/storage.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

const ALLOWED_CATEGORIES = ['audit_evidences', 'fiscal_reports', 'company_docs', 'profiles'];
const PERSIST_CATEGORIES = ['audit_evidences', 'fiscal_reports', 'company_docs'];

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
  validateField('data.auditProjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.nodeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.nodeId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('files.upload')
];

/**
 * Confirms that a file was uploaded to the presigned URL and persists
 * metadata in audit_documents. Key must belong to user's organization.
 * auditProjectId (or auditCaseId) and nodeId are optional and link the document to project/tree.
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

  if (!PERSIST_CATEGORIES.includes(data.category)) {
    return apiResponse(res, req, next)({
      document: {
        key,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        category: data.category,
        downloadUrl
      }
    });
  }

  const auditProjectId = data.auditProjectId ?? data.auditCaseId ?? null;
  const nodeId = data.nodeId ?? null;

  const { AuditDocument, AuditProject } = modelsInstance.models;

  if (auditProjectId) {
    const project = await AuditProject.findOne({
      where: { id: auditProjectId, organizationId: user.organizationId }
    });
    if (!project) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.confirm.projectNotFound');
    }
  }

  const record = await AuditDocument.create({
    organizationId: user.organizationId,
    auditProjectId,
    nodeId,
    storageKey: key,
    originalName: data.originalName,
    mimeType: data.mimeType,
    size: data.size,
    category: data.category,
    uploaderId: user.id,
    analysisStatus: 'pending'
  });

  const document = {
    id: record.id,
    key: record.storageKey,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    category: record.category,
    auditProjectId: record.auditProjectId,
    nodeId: record.nodeId,
    uploaderId: record.uploaderId,
    organizationId: record.organizationId,
    downloadUrl,
    analysisStatus: record.analysisStatus
  };

  return apiResponse(res, req, next)({ document });
}

const confirmRoute = {
  validators,
  default: handler,
  action: 'confirm',
  entity: 'files'
};

export default confirmRoute;
