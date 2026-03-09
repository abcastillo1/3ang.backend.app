import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import apiResponse from '../../../helpers/response.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.id')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('projects.view')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;
  const { AuditProject, Client, ProjectAssignment, User, AuditDocument } = modelsInstance.models;

  const project = await AuditProject.findOne({
    where: { id: data.id, organizationId: user.organizationId },
    include: [
      { model: Client, as: 'client' },
      {
        model: ProjectAssignment,
        as: 'assignments',
        include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }]
      },
      {
        model: AuditDocument,
        as: 'documents',
        attributes: ['id', 'originalName', 'mimeType', 'size', 'category', 'createdAt']
      }
    ]
  });

  if (!project) {
    throw throwError(HTTP_STATUS.NOT_FOUND, 'projects.notFound');
  }

  return apiResponse(res, req, next)({ project });
}

const viewRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'projects'
};

export default viewRoute;
export { validators };
