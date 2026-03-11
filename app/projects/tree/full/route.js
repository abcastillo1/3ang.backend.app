import { Sequelize } from 'sequelize';
import { validateField } from '../../../../helpers/validator.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import apiResponse from '../../../../helpers/response.js';
import { throwError } from '../../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.auditProjectId')
    .notEmpty()
    .withMessage('validators.auditProjectId.required')
    .isInt({ min: 1 })
    .withMessage('validators.auditProjectId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

/**
 * Normaliza nodos a camelCase para el front. refId enlaza con permanent_file_sections.id
 * (type folder) o checklist_items.id (type checklist_item).
 */
function mapNode(row) {
  return {
    id: row.id,
    auditProjectId: row.audit_project_id,
    parentId: row.parent_id,
    path: row.path,
    depth: row.depth,
    type: row.type,
    name: row.name,
    order: row.sort_order,
    refId: row.ref_id,
    isSystemNode: Boolean(row.is_system_node),
    documentsCount: Number(row.documentsCount) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, AuditTreeNode } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.auditProjectId, organizationId: user.organizationId }
  });
  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  const rows = await AuditTreeNode.findAll({
    where: { auditProjectId: project.id },
    attributes: {
      include: [
        [
          Sequelize.literal(`(SELECT COUNT(*) FROM audit_documents AS d WHERE d.node_id = AuditTreeNode.id)`),
          'documentsCount'
        ]
      ]
    },
    order: [['depth', 'ASC'], ['sort_order', 'ASC']],
    raw: true
  });

  const nodes = rows.map(mapNode);
  return apiResponse(res, req, next)({ nodes });
}

const fullRoute = {
  validators,
  default: handler,
  action: 'tree-full',
  entity: 'projects'
};

export default fullRoute;
