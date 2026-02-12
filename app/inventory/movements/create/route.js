import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import validateMovementCreate from '../../../../middleware/inventory/validateMovementCreate.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.establishmentId')
    .notEmpty()
    .withMessage('validators.establishmentId.required')
    .isInt({ min: 1 })
    .withMessage('validators.establishmentId.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('validators.description.invalid'),
  validateField('data.type')
    .notEmpty()
    .withMessage('validators.movementType.required')
    .isIn(['transfer', 'adjustment'])
    .withMessage('validators.movementType.invalid'),
  validateField('data.items')
    .notEmpty()
    .withMessage('validators.items.required')
    .isArray()
    .withMessage('validators.items.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.stock.update'),
  validateMovementCreate
];

async function handler(req, res, next) {
  const { Movement } = modelsInstance.models;
  const { establishmentId, description, items } = req.movementData;
  const userId = req.user.id;

  const movement = await Movement.createWithItems(establishmentId, userId, description, req.movementData.type, items);

  const movementWithRelations = await Movement.findByPk(movement.id, {
    include: [
      { model: modelsInstance.models.Establishment, as: 'establishment', attributes: ['id', 'name', 'code'] },
      { model: modelsInstance.models.User, as: 'user', attributes: ['id', 'fullName'] },
      { model: modelsInstance.models.Kardex, as: 'kardexEntries', where: { isCurrent: true }, required: false }
    ]
  });

  const response = {
    movement: {
      id: movementWithRelations.id,
      establishmentId: movementWithRelations.establishmentId,
      userId: movementWithRelations.userId,
      sequenceNumber: movementWithRelations.sequenceNumber,
      description: movementWithRelations.description,
      type: movementWithRelations.type,
      createdAt: movementWithRelations.createdAt,
      establishment: movementWithRelations.establishment
        ? {
            id: movementWithRelations.establishment.id,
            name: movementWithRelations.establishment.name,
            code: movementWithRelations.establishment.code
          }
        : null,
      user: movementWithRelations.user
        ? {
            id: movementWithRelations.user.id,
            fullName: movementWithRelations.user.fullName
          }
        : null,
      itemsCount: items.length
    }
  };

  return apiResponse(res, req, next)(response);
}

const createRoute = {
  validators,
  default: handler,
  action: 'create',
  entity: 'inventory.movements'
};

export default createRoute;
export { validators };
