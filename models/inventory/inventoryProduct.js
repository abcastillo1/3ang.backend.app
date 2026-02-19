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
        allowNull: true,
        get() {
          const value = this.getDataValue('image');
          if (!value) return null;
          try {
            return JSON.parse(value);
          } catch (e) {
            return value;
          }
        },
        set(value) {
          this.setDataValue('image', value ? JSON.stringify(value) : null);
        }
      },
      gallery: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const value = this.getDataValue('gallery');
          if (!value) return null;
          try {
            return JSON.parse(value);
          } catch (e) {
            return value;
          }
        },
        set(value) {
          this.setDataValue('gallery', value ? JSON.stringify(value) : null);
        }
      },
      unitOfMeasure: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'unit_of_measure'
      },
      generalPrice: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
        defaultValue: 0.0000,
        field: 'general_price'
      },
      costPrice: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
        defaultValue: 0.0000,
        field: 'cost_price'
      },
      ivaType: {
        type: DataTypes.STRING(10),
        allowNull: true,
        field: 'iva_type',
        comment: 'Ej: 0, 12, 15 (porcentaje IVA)'
      },
      minimumPrice: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
        defaultValue: 0.0000,
        field: 'minimum_price'
      },
      minStockLevel: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
        defaultValue: 0.0000,
        field: 'min_stock_level',
        comment: 'Stock mínimo por defecto del producto'
      },
      batchActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'batch_active',
        comment: 'true = control por lote activo (UI muestra código, vencimiento, listado); false = no (backend igual crea lote S/N)'
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
    InventoryProduct.hasMany(models.InventoryBatch, {
      foreignKey: 'product_id',
      as: 'batches'
    });
  };

  return InventoryProduct;
}
