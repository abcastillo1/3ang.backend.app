import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { storageService } from '../../../helpers/storage.js';
import { Op } from 'sequelize';
import modelsInstance from '../../../models/index.js';

export const validators = [
  validateField('data.auditProjectId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateField('data.nodeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.nodeId.invalid'),
  validateField('data.category')
    .optional()
    .isString()
    .withMessage('validators.category.invalid'),
  validateField('data.page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.page.invalid'),
  validateField('data.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('validators.limit.invalid'),
  validateRequest,
  authenticate,
  requirePermission('files.upload')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditDocument, User } = modelsInstance.models;

  const page = parseInt(data.page) || 1;
  const limit = parseInt(data.limit) || 20;
  const offset = (page - 1) * limit;

  const where = { organizationId: user.organizationId };

  if (data.auditProjectId) where.auditProjectId = data.auditProjectId;
  if (data.nodeId) where.nodeId = data.nodeId;
  if (data.category) where.category = data.category;

  const total = await AuditDocument.count({ where });

  const documents = await AuditDocument.findAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { model: User, as: 'uploader', attributes: ['id', 'fullName', 'email'] }
    ]
  });

  const documentsWithUrls = await Promise.all(
    documents.map(async (doc) => {
      const downloadUrl = await storageService.generateDownloadUrl(doc.storageKey);
      return {
        id: doc.id,
        key: doc.storageKey,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        category: doc.category,
        auditProjectId: doc.auditProjectId,
        nodeId: doc.nodeId,
        analysisStatus: doc.analysisStatus,
        uploader: doc.uploader ? { id: doc.uploader.id, fullName: doc.uploader.fullName } : null,
        downloadUrl,
        createdAt: doc.createdAt
      };
    })
  );

  return apiResponse(res, req, next)({
    documents: documentsWithUrls,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'files'
};

export default listRoute;
