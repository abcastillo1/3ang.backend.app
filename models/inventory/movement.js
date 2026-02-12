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
  Movement.createWithItems = async function (establishmentId, userId, description, type, items, existingTransaction = null) {
    const { InventoryStock } = sequelize.models;
    const run = async (transaction) => {
      const sequenceNumber = await Movement.getNextSequenceNumber(establishmentId, transaction);
      const movement = await Movement.create(
        { establishmentId, userId, sequenceNumber, description: description || null, type: type || 'adjustment' },
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
          targetEstablishmentId: item.targetEstablishmentId
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
  Movement.updateWithItems = async function (movementId, userId, description, items, existingTransaction = null) {
    const { Kardex, InventoryStock } = sequelize.models;
    const inverseType = (type) => (type === 'entry' ? 'exit' : type === 'exit' ? 'entry' : type);

    const run = async (transaction) => {
      const movement = await Movement.findByPk(movementId, { transaction });
      if (!movement) return null;

      const currentEntries = await Kardex.findAll({
        where: { movementId: movement.id, isCurrent: true },
        order: [['id', 'ASC']],
        transaction
      });

      for (const entry of currentEntries) {
        await entry.update({ isCurrent: false }, { transaction });
        const reversalQuantity = -parseFloat(entry.quantity);
        const reversalType = inverseType(entry.type);
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
        await Kardex.create(
          {
            establishmentId: entry.establishmentId,
            productId: entry.productId,
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

      if (description !== undefined) {
        await movement.update({ description, updatedAt: new Date() }, { transaction });
      }

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
          targetEstablishmentId: item.targetEstablishmentId
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
