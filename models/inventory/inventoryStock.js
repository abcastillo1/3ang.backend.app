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
