export default function (sequelize, DataTypes) {
  const InventoryLog = sequelize.define(
    'InventoryLog',
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      type: {
        type: DataTypes.ENUM('entry', 'exit', 'transfer', 'adjustment'),
        allowNull: false
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        field: 'quantity'
      },
      previousStock: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        field: 'previous_stock'
      },
      newStock: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false,
        field: 'new_stock'
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'inventory_logs',
      paranoid: false,
      timestamps: false,
      underscored: true
    }
  );

  InventoryLog.associate = function (models) {
    InventoryLog.belongsTo(models.Establishment, {
      foreignKey: 'establishment_id',
      as: 'establishment'
    });
    InventoryLog.belongsTo(models.InventoryProduct, {
      foreignKey: 'product_id',
      as: 'product'
    });
    InventoryLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return InventoryLog;
}
