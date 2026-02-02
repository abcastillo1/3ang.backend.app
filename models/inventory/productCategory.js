export default function (sequelize, DataTypes) {
  const ProductCategory = sequelize.define(
    'ProductCategory',
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
      name: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true
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
      tableName: 'product_categories',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  );

  ProductCategory.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  ProductCategory.associate = function (models) {
    ProductCategory.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    ProductCategory.hasMany(models.InventoryProduct, {
      foreignKey: 'category_id',
      as: 'products'
    });
  };

  return ProductCategory;
}
