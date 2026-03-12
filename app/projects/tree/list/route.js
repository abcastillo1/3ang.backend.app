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
  validateField('data.parentId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('validators.parentId.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

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

  const parentId = data.parentId || null;

  const nodes = await AuditTreeNode.findAll({
    where: { auditProjectId: project.id, parentId },
    attributes: {
      include: [
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM audit_tree_nodes AS c WHERE c.parent_id = AuditTreeNode.id AND c.deleted_at IS NULL)`
          ),
          'childrenCount'
        ],
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM audit_documents AS d WHERE d.node_id = AuditTreeNode.id AND d.comment_id IS NULL AND d.deleted_at IS NULL)`
          ),
          'documentsCount'
        ]
      ]
    },
    order: [['sort_order', 'ASC']]
  });

  return apiResponse(res, req, next)({ nodes });
}

const listRoute = {
  validators,
  default: handler,
  action: 'tree-list',
  entity: 'projects'
};

export default listRoute;
