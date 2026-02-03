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


  ProductCategory.VACCINES = 1;
  ProductCategory.ANTIBIOTICS = 2;
  ProductCategory.VITAMINS_AND_MINERALS = 3;
  ProductCategory.BALANCED_FEED = 4;
  ProductCategory.DISINFECTANTS = 5;
  ProductCategory.HORMONALS = 6;
  ProductCategory.DEWORMERS = 7;
  ProductCategory.BIRTH_SUPPLIES = 8;
  ProductCategory.IDENTIFICATION = 9;
  ProductCategory.TOOLS_AND_EQUIPMENT = 10;

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
