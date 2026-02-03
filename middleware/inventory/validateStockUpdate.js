import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';

export default async function validateStockUpdate(req, res, next) {
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

  const product = await InventoryProduct.findOne({
    where: {
      id: data.productId,
      organizationId: req.user.organizationId
    }
  });

  if (!product) {
    throwError(HTTP_STATUS.NOT_FOUND, 'inventory.products.notFound');
  }

  const type = data.type || 'adjustment';

  let targetEstablishment = null;
  if (type === 'transfer') {
    if (!data.targetEstablishmentId) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'validators.targetEstablishmentId.required');
    }

    if (data.establishmentId === data.targetEstablishmentId) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.sameEstablishment');
    }

    targetEstablishment = await Establishment.findOne({
      where: {
        id: data.targetEstablishmentId,
        organizationId: req.user.organizationId
      }
    });

    if (!targetEstablishment) {
      throwError(HTTP_STATUS.NOT_FOUND, 'establishments.targetNotFound');
    }
  }

  const existingStock = await InventoryStock.findOne({
    where: {
      establishmentId: data.establishmentId,
      productId: data.productId
    }
  });

  const previousStock = existingStock ? parseFloat(existingStock.currentStock) : 0;
  let newStock;
  let quantity;

  if (type === 'entry' || type === 'exit' || type === 'transfer') {
    if (!data.quantity && data.quantity !== 0) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'validators.quantity.required');
    }
    quantity = parseFloat(data.quantity);
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
    if (!data.currentStock && data.currentStock !== 0 && !data.quantity && data.quantity !== 0) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'validators.currentStock.required');
    }
    newStock = parseFloat(data.currentStock || data.quantity || 0);
    quantity = newStock - previousStock;
  } else {
    throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.invalidType');
  }

  req.stockData = {
    establishmentId: data.establishmentId,
    productId: data.productId,
    currentStock: newStock,
    minStockLevel: data.minStockLevel !== undefined ? parseFloat(data.minStockLevel) : (existingStock?.minStockLevel || 0),
    type: type,
    quantity: type === 'adjustment' ? (newStock - previousStock) : parseFloat(data.quantity || 0),
    previousStock: previousStock,
    reason: data.reason || null,
    metadata: data.metadata || null,
    targetEstablishmentId: type === 'transfer' ? data.targetEstablishmentId : null
  };

  req.establishment = establishment;
  req.product = product;
  req.targetEstablishment = targetEstablishment;

  next();
}
