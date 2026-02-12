import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.establishmentId')
    .notEmpty()
    .withMessage('validators.establishmentId.required')
    .isInt({ min: 1 })
    .withMessage('validators.establishmentId.invalid'),
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
  requirePermission('inventory.stock.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { Movement, Establishment } = modelsInstance.models;

  const establishment = await Establishment.findOne({
    where: {
      id: data.establishmentId,
      organizationId: req.user.organizationId
    }
  });

  if (!establishment) {
    throwError(HTTP_STATUS.NOT_FOUND, 'establishments.notFound');
  }

  const page = Math.max(1, parseInt(data.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(data.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const { count, rows: movements } = await Movement.findAndCountAll({
    where: { establishmentId: data.establishmentId },
    include: [
      { model: Establishment, as: 'establishment', attributes: ['id', 'name', 'code'] },
      { model: modelsInstance.models.User, as: 'user', attributes: ['id', 'fullName'] },
      {
        model: modelsInstance.models.Kardex,
        as: 'kardexEntries',
        where: { isCurrent: true },
        required: false
      }
    ],
    order: [['sequenceNumber', 'DESC']],
    limit,
    offset
  });

  const response = {
    movements: movements.map((m) => ({
      id: m.id,
      establishmentId: m.establishmentId,
      userId: m.userId,
      sequenceNumber: m.sequenceNumber,
      description: m.description,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      establishment: m.establishment
        ? { id: m.establishment.id, name: m.establishment.name, code: m.establishment.code }
        : null,
      user: m.user ? { id: m.user.id, fullName: m.user.fullName } : null,
      itemsCount: m.kardexEntries ? m.kardexEntries.length : 0
    })),
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  };

  return apiResponse(res, req, next)(response);
}

const listRoute = {
  validators,
  default: handler,
  action: 'list',
  entity: 'inventory.movements'
};

export default listRoute;
export { validators };
