export default function (sequelize, DataTypes) {
  const Organization = sequelize.define(
    'Organization',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ownerUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'owner_user_id'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      image: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      legalName: {
        type: DataTypes.STRING(255),
        field: 'legal_name'
      },
      taxId: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'tax_id'
      },
      ruc: {
        type: DataTypes.STRING(13),
        allowNull: true
      },
      sriRegimen: {
        type: DataTypes.STRING(100),
        field: 'sri_regimen'
      },
      email: {
        type: DataTypes.STRING(255)
      },
      phone: {
        type: DataTypes.STRING(50)
      },
      address: {
        type: DataTypes.TEXT
      },
      country: {
        type: DataTypes.STRING(100)
      },
      city: {
        type: DataTypes.STRING(100)
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      isAccountingRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_accounting_required'
      },
      environment: {
        type: DataTypes.ENUM('pruebas', 'produccion'),
        defaultValue: 'pruebas'
      },
      signaturePath: {
        type: DataTypes.STRING(255),
        field: 'signature_path'
      },
      signaturePassword: {
        type: DataTypes.STRING(255),
        field: 'signature_password'
      },
      signatureExpiry: {
        type: DataTypes.DATEONLY,
        field: 'signature_expiry'
      },
      signatureProvider: {
        type: DataTypes.STRING(100),
        field: 'signature_provider'
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
      tableName: 'organizations',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  );

  Organization.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  Organization.associate = function (models) {
    Organization.belongsTo(models.User, {
      foreignKey: 'owner_user_id',
      as: 'owner'
    });
    Organization.hasMany(models.User, {
      foreignKey: 'organization_id',
      as: 'users'
    });
    Organization.hasMany(models.Role, {
      foreignKey: 'organization_id',
      as: 'roles'
    });
    Organization.hasMany(models.OrganizationSetting, {
      foreignKey: 'organization_id',
      as: 'settings'
    });
    Organization.hasMany(models.AuditLog, {
      foreignKey: 'organization_id',
      as: 'auditLogs'
    });
    Organization.hasMany(models.ProductCategory, {
      foreignKey: 'organization_id',
      as: 'productCategories'
    });
    Organization.hasMany(models.InventoryProduct, {
      foreignKey: 'organization_id',
      as: 'inventoryProducts'
    });
    Organization.hasMany(models.Establishment, {
      foreignKey: 'organization_id',
      as: 'establishments'
    });
  };

  return Organization;
}