/**
 * Organization = audit firm (empresa de auditoría) that uses the platform
 * to manage accounting audit projects. Settings go in OrganizationSetting (key-value).
 */
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
        allowNull: false,
        comment: 'Display name of the audit firm'
      },
      legalName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'legal_name',
        comment: 'Legal / registered name'
      },
      ruc: {
        type: DataTypes.STRING(13),
        allowNull: true,
        comment: 'RUC (Ecuador). Unique per organization'
      },
      taxId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'tax_id',
        comment: 'Generic tax identifier (VAT, Tax ID, etc.). For Ecuador often same as RUC'
      },
      sriRegimen: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'sri_regimen',
        comment: 'SRI tax regime (Ecuador)'
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'Ecuador'
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      website: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      image: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Logo: path or JSON { path, url }',
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
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      defaultCurrency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'USD',
        field: 'default_currency'
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'America/Guayaquil',
        comment: 'IANA timezone for reports and dates'
      },
      locale: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: 'es-EC',
        comment: 'Default locale for reports'
      },
      registrationNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'registration_number',
        comment: 'Professional body / supervisory registration (e.g. Superintendencia)'
      },
      environment: {
        type: DataTypes.ENUM('pruebas', 'produccion'),
        defaultValue: 'pruebas',
        comment: 'SRI / production environment'
      },
      signaturePath: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'signature_path',
        comment: 'Electronic signature for signing audit reports'
      },
      signaturePassword: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'signature_password'
      },
      signatureExpiry: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'signature_expiry'
      },
      signatureProvider: {
        type: DataTypes.STRING(100),
        allowNull: true,
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
      underscored: true,
      indexes: [
        { unique: true, fields: ['ruc'], name: 'organizations_ruc_unique' }
      ]
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
    Organization.hasMany(models.Client, {
      foreignKey: 'organization_id',
      as: 'clients'
    });
  };

  return Organization;
}