import { validateField } from '../../../../helpers/validator.js';
import apiResponse from '../../../../helpers/response.js';
import validateRequest from '../../../../middleware/validation.js';
import authenticate from '../../../../middleware/auth.js';
import { requirePermission } from '../../../../middleware/permissions.js';
import { HTTP_STATUS } from '../../../../config/constants.js';
import { throwError } from '../../../../helpers/errors.js';
import modelsInstance from '../../../../models/index.js';

const validators = [
  validateField('data.id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateField('data.movementId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('validators.id.invalid'),
  validateRequest,
  authenticate,
  requirePermission('inventory.stock.update')
];

async function handler(req, res, next) {
  const { data } = req.body;
  const movementId = data?.id != null ? parseInt(data.id, 10) : (data?.movementId != null ? parseInt(data.movementId, 10) : null);

  if (!movementId || Number.isNaN(movementId)) {
    throwError(HTTP_STATUS.BAD_REQUEST, 'validators.id.required');
  }

  const { Movement, Establishment, Kardex, InventoryProduct, InventoryStock } = modelsInstance.models;

  const movement = await Movement.findByPk(movementId, {
    include: [
      { model: Establishment, as: 'establishment', attributes: ['id', 'name', 'code', 'organizationId'] },
      { model: modelsInstance.models.User, as: 'user', attributes: ['id', 'fullName'] }
    ]
  });

  if (!movement || movement.establishment.organizationId !== req.user.organizationId) {
    throwError(HTTP_STATUS.NOT_FOUND, 'inventory.movements.notFound');
  }

  const kardexEntries = await Kardex.findAll({
    where: {
      movementId: movement.id,
      isCurrent: true,
      isReversal: false,
      establishmentId: movement.establishmentId
    },
    order: [['id', 'ASC']],
    include: [{ model: InventoryProduct, as: 'product', attributes: ['id', 'name', 'sku'] }]
  });

  const productIds = [...new Set(kardexEntries.map((k) => k.productId))];
  const stocks = await InventoryStock.findAll({
    where: { establishmentId: movement.establishmentId, productId: productIds }
  });
  const minStockByProduct = Object.fromEntries(stocks.map((s) => [s.productId, parseFloat(s.minStockLevel)]));

  const items = kardexEntries.map((k) => ({
    productId: k.productId,
    productName: k.product?.name ?? null,
    sku: k.product?.sku ?? null,
    type: k.type,
    quantity: parseFloat(k.quantity),
    previousStock: parseFloat(k.previousStock),
    newStock: parseFloat(k.newStock),
    costPrice: k.costPrice != null ? parseFloat(k.costPrice) : null,
    batchDetail: k.batchDetail,
    dateAt: k.dateAt ?? null,
    reason: k.reason ?? null,
    metadata: k.metadata ?? null,
    targetEstablishmentId: k.metadata?.targetEstablishmentId ?? null,
    minStockLevel: minStockByProduct[k.productId] ?? null
  }));

  const response = {
    movement: {
      id: movement.id,
      establishmentId: movement.establishmentId,
      userId: movement.userId,
      sequenceNumber: movement.sequenceNumber,
      description: movement.description ?? null,
      type: movement.type,
      dateAt: movement.dateAt ?? null,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
      establishment: movement.establishment
        ? { id: movement.establishment.id, name: movement.establishment.name, code: movement.establishment.code }
        : null,
      user: movement.user ? { id: movement.user.id, fullName: movement.user.fullName } : null,
      items
    }
  };

  return apiResponse(res, req, next)(response);
}

const viewRoute = {
  validators,
  default: handler,
  action: 'view',
  entity: 'inventory.movements'
};

export default viewRoute;
export { validators };
