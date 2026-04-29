import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { storageService } from '../../../helpers/storage.js';
import { Op } from 'sequelize';
import { fetchCrossReferencesByDocumentIds } from '../../../helpers/cross-reference.js';

// Por defecto, listado por nodeId excluye adjuntos de comentarios (evidencia solamente)

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
  validateField('data.includeCommentAttachments')
    .optional()
    .isBoolean()
    .withMessage('validators.includeCommentAttachments.invalid'),
  validateField('data.includeCrossReferences')
    .optional()
    .isBoolean()
    .withMessage('references.includeCrossReferences.invalid'),
  validateField('data.search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('files.list.search.invalid'),
  validateField('data.excludeDocumentId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('files.list.excludeDocumentId.invalid'),
  validateField('data.excludeDocumentIds')
    .optional()
    .isArray({ max: 50 })
    .withMessage('files.list.excludeDocumentIds.invalid'),
  validateField('data.excludeDocumentIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('files.list.excludeDocumentIds.invalid'),
  validateField('data.includeDownloadUrl')
    .optional()
    .isBoolean()
    .withMessage('files.list.includeDownloadUrl.invalid'),
  validateRequest,
  authenticate,
  requirePermission('files.upload')
];

function collectExcludeDocumentIds(data) {
  const ids = new Set();
  if (data.excludeDocumentId != null && data.excludeDocumentId !== '') {
    ids.add(parseInt(data.excludeDocumentId, 10));
  }
  if (Array.isArray(data.excludeDocumentIds)) {
    for (const x of data.excludeDocumentIds) {
      const n = parseInt(x, 10);
      if (n > 0) ids.add(n);
    }
  }
  return [...ids].filter((n) => !Number.isNaN(n));
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditDocument, User } = req.models;

  const page = parseInt(data.page) || 1;
  const limit = parseInt(data.limit) || 20;
  const offset = (page - 1) * limit;
  const includeDownloadUrl = data.includeDownloadUrl !== false;

  const andConditions = [{ organizationId: user.organizationId }];

  if (data.auditProjectId) {
    andConditions.push({ auditProjectId: data.auditProjectId });
  }
  if (data.nodeId) {
    andConditions.push({ nodeId: data.nodeId });
    if (!data.includeCommentAttachments) {
      andConditions.push({ commentId: { [Op.is]: null } });
    }
  }
  if (data.category) {
    andConditions.push({ category: data.category });
  }
  const searchTerm = typeof data.search === 'string' ? data.search.trim() : '';
  if (searchTerm.length > 0) {
    const safe = searchTerm.replace(/[%_]/g, '');
    if (safe.length > 0) {
      andConditions.push({ originalName: { [Op.like]: `%${safe}%` } });
    }
  }
  const excludeIds = collectExcludeDocumentIds(data);
  if (excludeIds.length > 0) {
    andConditions.push({ id: { [Op.notIn]: excludeIds } });
  }

  const where = { [Op.and]: andConditions };

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

  let documentsWithUrls = await Promise.all(
    documents.map(async (doc) => {
      const downloadUrl = includeDownloadUrl
        ? await storageService.generateDownloadUrl(doc.storageKey)
        : null;
      return {
        id: doc.id,
        key: doc.storageKey,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        category: doc.category,
        auditProjectId: doc.auditProjectId,
        nodeId: doc.nodeId,
        commentId: doc.commentId,
        analysisStatus: doc.analysisStatus,
        uploader: doc.uploader ? { id: doc.uploader.id, fullName: doc.uploader.fullName } : null,
        downloadUrl,
        createdAt: doc.createdAt
      };
    })
  );

  const payload = {
    documents: documentsWithUrls,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };

  if (data.includeCrossReferences === true) {
    const models = req.models;
    const byProject = new Map();
    for (const doc of documents) {
      if (!doc.auditProjectId) continue;
      if (!byProject.has(doc.auditProjectId)) {
        byProject.set(doc.auditProjectId, []);
      }
      byProject.get(doc.auditProjectId).push(doc.id);
    }
    const refMap = new Map();
    for (const [auditProjectId, docIds] of byProject) {
      const m = await fetchCrossReferencesByDocumentIds(models, {
        organizationId: user.organizationId,
        auditProjectId,
        documentIds: docIds
      });
      for (const [docId, refs] of m) {
        refMap.set(docId, refs);
      }
    }
    documentsWithUrls = documentsWithUrls.map((d) => ({
      ...d,
      crossReferences: refMap.get(d.id) ?? []
    }));
    payload.documents = documentsWithUrls;
  }

  return apiResponse(res, req, next)(payload);
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'files'
};

export default listRoute;
