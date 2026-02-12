export default function (sequelize, DataTypes) {
  const InventoryProduct = sequelize.define(
    'InventoryProduct',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'organization_id'
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'category_id'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      image: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      gallery: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      unitOfMeasure: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'unit_of_measure'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: 'deleted_at'
      }
    },
    {
      tableName: 'inventory_products',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  );

  InventoryProduct.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  InventoryProduct.associate = function (models) {
    InventoryProduct.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    InventoryProduct.belongsTo(models.ProductCategory, {
      foreignKey: 'category_id',
      as: 'category'
    });
    InventoryProduct.hasMany(models.InventoryStock, {
      foreignKey: 'product_id',
      as: 'stocks'
    });
    InventoryProduct.hasMany(models.Kardex, {
      foreignKey: 'product_id',
      as: 'kardexEntries'
    });
  };

  return InventoryProduct;
}
