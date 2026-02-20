/**
 * Movement: one transaction that groups multiple stock changes (entries/exits/transfers/adjustments).
 * A single movement can apply changes to several products at once; each change updates stock and creates kardex records.
 */
export default function (sequelize, DataTypes) {
  const Movement = sequelize.define(
    'Movement',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      establishmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'establishment_id'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      sequenceNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'sequence_number'
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      dateAt: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'date_at',
        comment: 'Fecha ingresada por el usuario (ej. fecha de ingreso/transferencia); si no se envía, se usa la fecha del sistema'
      },
      type: {
        type: DataTypes.ENUM('transfer', 'adjustment'),
        allowNull: false,
        defaultValue: 'adjustment'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      }
    },
    {
      tableName: 'movements',
      paranoid: false,
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['establishment_id', 'sequence_number'],
          name: 'movements_establishment_sequence_unique'
        }
      ]
    }
  );

  Movement.getNextSequenceNumber = async function (establishmentId, transaction = null) {
    const options = transaction ? { transaction } : {};
    const result = await Movement.findOne({
      where: { establishmentId },
      attributes: [[sequelize.fn('MAX', sequelize.col('sequence_number')), 'maxSeq']],
      raw: true,
      ...options
    });
    const maxSeq = result?.maxSeq ?? 0;
    return Number(maxSeq) + 1;
  };

  /**
   * Creates a movement and applies multiple stock changes (entries/exits/transfers/adjustments)
   * in a single transaction. Each item updates inventory_stock and creates kardex records.
   * One movement = one transaction that can affect multiple products.
   * @param {number} establishmentId
   * @param {number} userId
   * @param {string|null} description
   * @param {string} type - 'transfer' | 'adjustment'
   * @param {Array<{ productId: number, type: string, quantity: number, currentStock: number, previousStock: number, minStockLevel?: number, reason?: string, metadata?: object, targetEstablishmentId?: number }>} items - one or more products (each entry/exit affects stock)
   * @param {object|null} existingTransaction
   * @returns {Promise<Movement>}
   */
  Movement.createWithItems = async function (establishmentId, userId, description, type, items, existingTransaction = null, dateAt = null) {
    const { InventoryStock } = sequelize.models;
    const run = async (transaction) => {
      const sequenceNumber = await Movement.getNextSequenceNumber(establishmentId, transaction);
      const opDate = dateAt || new Date().toISOString().slice(0, 10);
      const movement = await Movement.create(
        { establishmentId, userId, sequenceNumber, description: description || null, type: type || 'adjustment', dateAt: opDate },
        { transaction }
      );
      for (const item of items) {
        const stockParams = {
          establishmentId,
          productId: item.productId,
          currentStock: item.currentStock,
          minStockLevel: item.minStockLevel,
          type: item.type,
          quantity: item.quantity,
          previousStock: item.previousStock,
          reason: item.reason,
          metadata: item.metadata,
          targetEstablishmentId: item.targetEstablishmentId,
          batchId: item.batchId,
          unitCost: item.unitCost,
          batchCode: item.batchCode,
          manufacturingDate: item.manufacturingDate,
          expirationDate: item.expirationDate,
          batches: item.batches,
          dateAt: movement.dateAt
        };
        await InventoryStock.updateStock(stockParams, userId, movement.id, transaction);
      }
      return movement;
    };
    if (existingTransaction) return run(existingTransaction);
    return sequelize.transaction(run);
  };

  /**
   * Reverses all current kardex entries for the movement (restores stock, creates reversal kardex),
   * then applies the new items. All stock changes are applied in one transaction.
   * @param {number} movementId
   * @param {number} userId
   * @param {string|undefined} description - optional new description
   * @param {Array<{ productId: number, type: string, quantity: number, currentStock?: number, minStockLevel?: number, reason?: string, metadata?: object, targetEstablishmentId?: number }>} items - new set of items (each affects stock)
   * @param {object|null} existingTransaction
   * @returns {Promise<Movement>}
   */
  Movement.updateWithItems = async function (movementId, userId, description, items, existingTransaction = null, dateAt = null) {
    const { Kardex, InventoryStock, InventoryBatch } = sequelize.models;
    const inverseType = (type) => (type === 'entry' ? 'exit' : type === 'exit' ? 'entry' : type);

    const run = async (transaction) => {
      const movement = await Movement.findByPk(movementId, { transaction });
      if (!movement) return null;

      const currentEntries = await Kardex.findAll({
        where: { movementId: movement.id, isCurrent: true },
        order: [['id', 'ASC']],
        transaction
      });

      const originalBatchDetailByProduct = {};
      for (const entry of currentEntries) {
        await entry.update({ isCurrent: false }, { transaction });
        const rawBatchDetail = entry.getDataValue('batchDetail');
        const batchDetailArr = rawBatchDetail != null
          ? (Array.isArray(rawBatchDetail) ? rawBatchDetail : (typeof rawBatchDetail === 'string' ? (() => { try { const p = JSON.parse(rawBatchDetail); return Array.isArray(p) ? p : []; } catch { return []; } })() : []))
          : [];
        originalBatchDetailByProduct[`${entry.productId}:${entry.type}`] = { rawBatchDetail: batchDetailArr, entry };

        const reversalQuantity = -parseFloat(entry.quantity);
        const reversalType = inverseType(entry.type);

        if (batchDetailArr.length > 0) {
          for (const item of batchDetailArr) {
            const batch = await InventoryBatch.findByPk(item.batchId, { transaction });
            if (batch) {
              const qty = parseFloat(item.quantity);
              const currentQty = parseFloat(batch.currentQuantity);
              if (entry.type === 'entry') {
                await batch.update({ currentQuantity: Math.max(0, currentQty - qty), updatedAt: new Date() }, { transaction });
              } else {
                await batch.update({ currentQuantity: currentQty + qty, updatedAt: new Date() }, { transaction });
              }
            }
          }
          await InventoryBatch.syncInventoryStock(entry.productId, entry.establishmentId, transaction);
        } else {
          const stockRow = await InventoryStock.findOne({
            where: { establishmentId: entry.establishmentId, productId: entry.productId },
            transaction
          });
          if (stockRow) {
            await stockRow.update(
              { currentStock: entry.previousStock, updatedAt: new Date() },
              { transaction }
            );
          }
        }

        await Kardex.create(
          {
            establishmentId: entry.establishmentId,
            productId: entry.productId,
            batchDetail: batchDetailArr.length > 0 ? batchDetailArr : null,
            costPrice: entry.costPrice,
            dateAt: entry.dateAt,
            userId,
            movementId: movement.id,
            type: reversalType,
            quantity: reversalQuantity,
            previousStock: entry.newStock,
            newStock: entry.previousStock,
            reason: entry.reason ? `Reversal: ${entry.reason}` : 'Reversal',
            metadata: entry.metadata ? { ...entry.metadata, isReversal: true } : { isReversal: true },
            isCurrent: false,
            isReversal: true,
            createdAt: new Date()
          },
          { transaction }
        );
      }

      const updatePayload = { updatedAt: new Date() };
      if (description !== undefined) updatePayload.description = description;
      if (dateAt != null && dateAt !== '') updatePayload.dateAt = dateAt;
      if (Object.keys(updatePayload).length > 1) {
        await movement.update(updatePayload, { transaction });
      }

      const movementDateAt = updatePayload.dateAt ?? movement.dateAt;
      for (const item of items) {
        const existingStock = await InventoryStock.findOne({
          where: { establishmentId: movement.establishmentId, productId: item.productId },
          transaction
        });
        const previousStock = existingStock ? parseFloat(existingStock.currentStock) : 0;
        let newStock;
        let quantity;
        const type = item.type;
        if (type === 'entry') {
          newStock = previousStock + item.quantity;
          quantity = item.quantity;
        } else if (type === 'exit' || type === 'transfer') {
          newStock = previousStock - item.quantity;
          quantity = item.quantity;
        } else {
          newStock = parseFloat(item.currentStock ?? item.quantity ?? 0);
          quantity = newStock - previousStock;
        }

        let batchId = item.batchId;
        let batches = item.batches;
        const hasNoBatchInfo = (type === 'entry') && !batchId && (!batches || !Array.isArray(batches) || batches.length === 0);
        if (hasNoBatchInfo) {
          const original = originalBatchDetailByProduct[`${item.productId}:${type}`];
          const origDetail = original?.rawBatchDetail;
          if (origDetail && origDetail.length > 0) {
            if (origDetail.length === 1) {
              batchId = origDetail[0]?.batchId;
            } else {
              const origTotal = origDetail.reduce((s, b) => s + parseFloat(b.quantity || 0), 0);
              const qty = parseFloat(quantity);
              batches = origDetail.map((b, i) => {
                const origQty = parseFloat(b.quantity || 0);
                const ratio = origTotal > 0 ? origQty / origTotal : (i === 0 ? 1 : 0);
                if (i === origDetail.length - 1) {
                  const restQty = origDetail.slice(0, -1).reduce((s, x) => s + (qty * (parseFloat(x.quantity || 0) / origTotal)), 0);
                  return { batchId: b.batchId, quantity: Math.round((qty - restQty) * 10000) / 10000 };
                }
                return { batchId: b.batchId, quantity: Math.round(qty * ratio * 10000) / 10000 };
              });
            }
          }
        }

        const stockParams = {
          establishmentId: movement.establishmentId,
          productId: item.productId,
          currentStock: newStock,
          minStockLevel: item.minStockLevel,
          type: item.type,
          quantity,
          previousStock,
          reason: item.reason,
          metadata: item.metadata,
          targetEstablishmentId: item.targetEstablishmentId,
          batchId,
          unitCost: item.unitCost,
          batchCode: item.batchCode,
          manufacturingDate: item.manufacturingDate,
          expirationDate: item.expirationDate,
          batches,
          dateAt: movementDateAt
        };
        await InventoryStock.updateStock(stockParams, userId, movement.id, transaction);
      }
      return movement;
    };
    if (existingTransaction) return run(existingTransaction);
    return sequelize.transaction(run);
  };

  Movement.associate = function (models) {
    Movement.belongsTo(models.Establishment, {
      foreignKey: 'establishment_id',
      as: 'establishment'
    });
    Movement.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Movement.hasMany(models.Kardex, {
      foreignKey: 'movement_id',
      as: 'kardexEntries'
    });
  };

  return Movement;
}
