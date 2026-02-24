import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';

export default async function validateMovementCreate(req, res, next) {
  const { data } = req.body;
  const { Establishment, InventoryProduct, InventoryStock, InventoryBatch } = modelsInstance.models;

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

    const batchActive = !!product.batchActive;
    let validatedBatches = null;

    if (batchActive && type === 'entry' && item.batchId && (!item.batches || !Array.isArray(item.batches) || item.batches.length === 0)) {
      const batch = await InventoryBatch.findOne({
        where: {
          id: item.batchId,
          productId: item.productId,
          establishmentId: data.establishmentId
        }
      });
      if (!batch) {
        throwError(HTTP_STATUS.NOT_FOUND, 'inventory.batches.notFound');
      }
    }

    if (!batchActive) {
      validatedBatches = null;
    } else if (type === 'entry' && item.batches && Array.isArray(item.batches) && item.batches.length > 0) {
      let batchesSum = 0;
      validatedBatches = item.batches.map((b) => {
        const qty = parseFloat(b.quantity);
        if (qty == null || Number.isNaN(qty) || qty <= 0) {
          throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.batches.quantityRequired');
        }
        batchesSum += qty;
        return {
          quantity: qty,
          batchCode: b.batchCode != null ? String(b.batchCode).trim() : null,
          manufacturingDate: b.manufacturingDate || null,
          expirationDate: b.expirationDate || null,
          unitCost: b.unitCost != null ? parseFloat(b.unitCost) : null
        };
      });
      if (Math.abs(batchesSum - quantity) > 0.0001) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.batches.sumMustEqualQuantity');
      }
    }

    if (batchActive && type === 'exit' && item.batches && Array.isArray(item.batches) && item.batches.length > 0) {
      let exitBatchesSum = 0;
      validatedBatches = [];
      for (const b of item.batches) {
        const batchIdVal = b.batchId != null ? parseInt(b.batchId, 10) : null;
        const qty = parseFloat(b.quantity);
        if (batchIdVal == null || Number.isNaN(qty) || qty <= 0) {
          throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.batches.batchIdAndQuantityRequired');
        }
        exitBatchesSum += qty;
        const exitBatch = await InventoryBatch.findOne({
          where: {
            id: batchIdVal,
            productId: item.productId,
            establishmentId: data.establishmentId
          }
        });
        if (!exitBatch) {
          throwError(HTTP_STATUS.NOT_FOUND, 'inventory.batches.notFound');
        }
        const batchQty = parseFloat(exitBatch.currentQuantity);
        if (batchQty < qty) {
          throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.insufficientStock');
        }
        validatedBatches.push({ batchId: batchIdVal, quantity: qty });
      }
      if (Math.abs(exitBatchesSum - quantity) > 0.0001) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.batches.sumMustEqualQuantity');
      }
    } else if (batchActive && type === 'exit' && item.batchId) {
      const exitBatch = await InventoryBatch.findOne({
        where: {
          id: item.batchId,
          productId: item.productId,
          establishmentId: data.establishmentId
        }
      });
      if (!exitBatch) {
        throwError(HTTP_STATUS.NOT_FOUND, 'inventory.batches.notFound');
      }
      const batchQty = parseFloat(exitBatch.currentQuantity);
      if (batchQty < quantity) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.insufficientStock');
      }
    }

    if (batchActive && type === 'transfer' && item.batches && Array.isArray(item.batches) && item.batches.length > 0) {
      let exitBatchesSum = 0;
      validatedBatches = [];
      for (const b of item.batches) {
        const batchIdVal = b.batchId != null ? parseInt(b.batchId, 10) : null;
        const qty = parseFloat(b.quantity);
        if (batchIdVal == null || Number.isNaN(qty) || qty <= 0) {
          throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.batches.batchIdAndQuantityRequired');
        }
        exitBatchesSum += qty;
        const exitBatch = await InventoryBatch.findOne({
          where: {
            id: batchIdVal,
            productId: item.productId,
            establishmentId: data.establishmentId
          }
        });
        if (!exitBatch) {
          throwError(HTTP_STATUS.NOT_FOUND, 'inventory.batches.notFound');
        }
        const batchQty = parseFloat(exitBatch.currentQuantity);
        if (batchQty < qty) {
          throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.insufficientStock');
        }
        validatedBatches.push({ batchId: batchIdVal, quantity: qty });
      }
      if (Math.abs(exitBatchesSum - quantity) > 0.0001) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.batches.sumMustEqualQuantity');
      }
    } else if (batchActive && type === 'transfer' && item.batchId) {
      const exitBatch = await InventoryBatch.findOne({
        where: {
          id: item.batchId,
          productId: item.productId,
          establishmentId: data.establishmentId
        }
      });
      if (!exitBatch) {
        throwError(HTTP_STATUS.NOT_FOUND, 'inventory.batches.notFound');
      }
      const batchQty = parseFloat(exitBatch.currentQuantity);
      if (batchQty < quantity) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'inventory.stock.insufficientStock');
      }
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
      targetEstablishmentId: type === 'transfer' ? item.targetEstablishmentId : null,
      batchId: (batchActive && ((type === 'entry' && !validatedBatches && item.batchId) || (type === 'exit' && !validatedBatches && item.batchId) || (type === 'transfer' && !validatedBatches && item.batchId))) ? parseInt(item.batchId, 10) : null,
      unitCost: (batchActive && type === 'entry' && !validatedBatches && item.unitCost != null) ? parseFloat(item.unitCost) : null,
      batchCode: (batchActive && type === 'entry' && !validatedBatches && item.batchCode) ? String(item.batchCode).trim() : null,
      manufacturingDate: (batchActive && type === 'entry' && !validatedBatches && item.manufacturingDate) ? item.manufacturingDate : null,
      expirationDate: (batchActive && type === 'entry' && !validatedBatches && item.expirationDate) ? item.expirationDate : null,
      batches: validatedBatches
    });
  }

  let dateAt = null;
  if (data.dateAt != null && data.dateAt !== '') {
    const d = new Date(data.dateAt);
    if (Number.isNaN(d.getTime())) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'validators.date.invalid');
    }
    dateAt = d.toISOString().slice(0, 10);
  }

  req.movementData = {
    establishmentId: data.establishmentId,
    description: data.description || null,
    type: movementType,
    items: validatedItems,
    dateAt
  };
  req.establishment = establishment;
  next();
}
