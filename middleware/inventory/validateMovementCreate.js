import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';

export default async function validateMovementCreate(req, res, next) {
  const { data } = req.body;
  const { Establishment, InventoryProduct, InventoryStock } = modelsInstance.models;

  const establishment = await Establishment.findOne({
    where: {
      id: data.establishmentId,
      organizationId: req.user.organizationId
    }
  });

  if (!establishment) {
    throwError(HTTP_STATUS.NOT_FOUND, 'establishments.notFound');
  }

  const movementType = data.type === 'transfer' || data.type === 'adjustment' ? data.type : null;
  if (!movementType) {
    throwError(HTTP_STATUS.BAD_REQUEST, 'validators.movementType.required');
  }

  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    throwError(HTTP_STATUS.BAD_REQUEST, 'validators.items.required');
  }

  const validatedItems = [];
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const itemType = item.type || 'adjustment';
    if (movementType === 'transfer' && itemType !== 'transfer') {
      throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.movements.itemsMustBeTransfer');
    }
    if (movementType === 'adjustment' && itemType === 'transfer') {
      throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.movements.itemsMustBeAdjustment');
    }
    const product = await InventoryProduct.findOne({
      where: {
        id: item.productId,
        organizationId: req.user.organizationId
      }
    });

    if (!product) {
      throwError(HTTP_STATUS.NOT_FOUND, 'inventory.products.notFound');
    }

    const type = itemType;
    const existingStock = await InventoryStock.findOne({
      where: {
        establishmentId: data.establishmentId,
        productId: item.productId
      }
    });

    const previousStock = existingStock ? parseFloat(existingStock.currentStock) : 0;
    let newStock;
    let quantity;

    if (type === 'entry' || type === 'exit' || type === 'transfer') {
      if (item.quantity == null || item.quantity === '') {
        throwError(HTTP_STATUS.BAD_REQUEST, 'validators.quantity.required');
      }
      quantity = parseFloat(item.quantity);
      if (quantity <= 0) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'validators.quantity.invalid');
      }

      if (type === 'entry') {
        newStock = previousStock + quantity;
      } else if (type === 'exit' || type === 'transfer') {
        newStock = previousStock - quantity;
        if (newStock < 0) {
          throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.insufficientStock');
        }
      }
    } else if (type === 'adjustment') {
      if (item.currentStock == null && item.quantity == null) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'validators.currentStock.required');
      }
      newStock = parseFloat(item.currentStock ?? item.quantity ?? 0);
      quantity = newStock - previousStock;
    } else {
      throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.invalidType');
    }

    if (type === 'transfer') {
      if (!item.targetEstablishmentId) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'validators.targetEstablishmentId.required');
      }
      if (data.establishmentId === item.targetEstablishmentId) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.sameEstablishment');
      }
      const targetEstablishment = await Establishment.findOne({
        where: {
          id: item.targetEstablishmentId,
          organizationId: req.user.organizationId
        }
      });
      if (!targetEstablishment) {
        throwError(HTTP_STATUS.NOT_FOUND, 'establishments.targetNotFound');
      }
    }

    validatedItems.push({
      productId: item.productId,
      type,
      quantity: type === 'adjustment' ? quantity : parseFloat(item.quantity),
      currentStock: newStock,
      previousStock,
      minStockLevel: item.minStockLevel !== undefined ? parseFloat(item.minStockLevel) : (existingStock?.minStockLevel ?? 0),
      reason: item.reason || null,
      metadata: item.metadata || null,
      targetEstablishmentId: type === 'transfer' ? item.targetEstablishmentId : null
    });
  }

  req.movementData = {
    establishmentId: data.establishmentId,
    description: data.description || null,
    type: movementType,
    items: validatedItems
  };
  req.establishment = establishment;
  next();
}
