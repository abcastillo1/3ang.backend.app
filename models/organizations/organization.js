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
      legalName: {
        type: DataTypes.STRING(255),
        field: 'legal_name'
      },
      taxId: {
        type: DataTypes.STRING(50),
        unique: true,
        field: 'tax_id'
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
  };

  return Organization;
}
