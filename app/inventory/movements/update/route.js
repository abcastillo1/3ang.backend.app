import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import validateMovementUpdate from '../../../../middleware/inventory/validateMovementUpdate.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.movementId')
    .notEmpty()
    .withMessage('validators.id.required')
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.description')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('validators.description.invalid'),
  validateField('data.items')
    .notEmpty()
    .withMessage('validators.items.required')
    .isArray()
    .withMessage('validators.items.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.stock.update'),
  validateMovementUpdate
];

async function handler(req, res, next) {
  const { Movement } = modelsInstance.models;
  const movement = req.movement;
  const { description, items } = req.movementData;
  const userId = req.user.id;

  await Movement.updateWithItems(movement.id, userId, description, items);

  const movementWithRelations = await Movement.findByPk(movement.id, {
    include: [
      { model: modelsInstance.models.Establishment, as: 'establishment', attributes: ['id', 'name', 'code'] },
      { model: modelsInstance.models.User, as: 'user', attributes: ['id', 'fullName'] },
      {
        model: modelsInstance.models.Kardex,
        as: 'kardexEntries',
        where: { isCurrent: true },
        required: false
      }
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
      dateAt: movementWithRelations.dateAt ?? null,
      createdAt: movementWithRelations.createdAt,
      updatedAt: movementWithRelations.updatedAt,
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
      itemsCount: movementWithRelations.kardexEntries ? movementWithRelations.kardexEntries.length : 0
    }
  };

  return apiResponse(res, req, next)(response);
}

const updateRoute = {
  validators,
  default: handler,
  action: 'update',
  entity: 'inventory.movements'
};

export default updateRoute;
export { validators };
