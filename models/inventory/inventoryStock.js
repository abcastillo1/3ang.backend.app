export default function (sequelize, DataTypes) {
  const InventoryStock = sequelize.define(
    'InventoryStock',
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
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'product_id'
      },
      currentStock: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        defaultValue: 0.0000,
        field: 'current_stock'
      },
      minStockLevel: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
        defaultValue: 0.0000,
        field: 'min_stock_level'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      }
    },
    {
      tableName: 'inventory_stock',
      paranoid: false,
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['establishment_id', 'product_id'],
          name: 'est_prod_unique'
        }
      ]
    }
  );

  /**
   * Applies one stock change: updates inventory_stock and creates kardex record(s).
   * For transfers, updates both origin and destination stock and creates two kardex rows.
   * Used by Movement.createWithItems and Movement.updateWithItems (movements API).
   */
  InventoryStock.updateStock = async function (stockParams, userId, movementId = null, existingTransaction = null) {
    const { establishmentId, productId, currentStock, minStockLevel, type, quantity, previousStock, reason, metadata, targetEstablishmentId } = stockParams;
    const { Kardex } = sequelize.models;

    const runInTransaction = async (transaction) => {

      const existingStock = await InventoryStock.findOne({
        where: {
          establishmentId: establishmentId,
          productId: productId
        },
        transaction
      });

      const stockData = {
        establishmentId: establishmentId,
        productId: productId,
        currentStock: currentStock,
        minStockLevel: minStockLevel,
        updatedAt: new Date()
      };

      let stock;
      if (existingStock) {
        await existingStock.update(stockData, { transaction });
        stock = existingStock;
      } else {
        stock = await InventoryStock.create(stockData, { transaction });
      }

      const logMetadata = type === 'transfer' && targetEstablishmentId
        ? {
            ...metadata,
            targetEstablishmentId: targetEstablishmentId,
            transferType: 'transfer'
          }
        : metadata;

      const kardexData = {
        establishmentId: establishmentId,
        productId: productId,
        userId: userId,
        movementId: movementId || null,
        type: type,
        quantity: quantity,
        previousStock: previousStock,
        newStock: currentStock,
        reason: reason || null,
        metadata: logMetadata || null,
        isCurrent: true,
        isReversal: false,
        createdAt: new Date()
      };

      await Kardex.create(kardexData, { transaction });

      //tranferencias de producto  
      if (type === 'transfer' && targetEstablishmentId) {
        const targetStock = await InventoryStock.findOne({
          where: {
            establishmentId: targetEstablishmentId,
            productId: productId
          },
          transaction
        });

        const targetPreviousStock = targetStock ? parseFloat(targetStock.currentStock) : 0;
        const targetNewStock = targetPreviousStock + parseFloat(quantity);

        const targetStockData = {
          establishmentId: targetEstablishmentId,
          productId: productId,
          currentStock: targetNewStock,
          minStockLevel: targetStock?.minStockLevel || 0,
          updatedAt: new Date()
        };

        if (targetStock) {
          await targetStock.update(targetStockData, { transaction });
        } else {
          await InventoryStock.create(targetStockData, { transaction });
        }

        const targetKardexData = {
          establishmentId: targetEstablishmentId,
          productId: productId,
          userId: userId,
          movementId: movementId || null,
          type: 'entry',
          quantity: parseFloat(quantity),
          previousStock: targetPreviousStock,
          newStock: targetNewStock,
          reason: reason ? `Recepción: ${reason}` : 'Transferencia recibida',
          metadata: {
            ...metadata,
            sourceEstablishmentId: establishmentId,
            transferType: 'transfer'
          },
          isCurrent: true,
          isReversal: false,
          createdAt: new Date()
        };

        await Kardex.create(targetKardexData, { transaction });
      }

      return stock;
    };

    if (existingTransaction) {
      return await runInTransaction(existingTransaction);
    }
    return await sequelize.transaction(runInTransaction);
  };

  InventoryStock.associate = function (models) {
    InventoryStock.belongsTo(models.Establishment, {
      foreignKey: 'establishment_id',
      as: 'establishment'
    });
    InventoryStock.belongsTo(models.InventoryProduct, {
      foreignKey: 'product_id',
      as: 'product'
    });
  };

  return InventoryStock;
}
