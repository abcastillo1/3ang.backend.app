export default function (sequelize, DataTypes) {
  const Establishment = sequelize.define(
    'Establishment',
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
        type: DataTypes.STRING(255),
        allowNull: false
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      establishmentCode: {
        type: DataTypes.STRING(5),
        allowNull: true,
        field: 'establishment_code',
        comment: 'Código del establecimiento (ej: 001)'
      },
      emissionPointCode: {
        type: DataTypes.STRING(5),
        allowNull: true,
        field: 'emission_point_code',
        comment: 'Punto de emisión (ej: 001)'
      },
      currentSequential: {
        type: DataTypes.INTEGER.UNSIGNED,
        defaultValue: 0,
        field: 'current_sequential',
        comment: 'Secuencial numérico actual'
      },
      documentSequences: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'document_sequences',
        comment: 'Objeto JSON con secuenciales futuros'
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
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
      tableName: 'establishments',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  );

  Establishment.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  Establishment.associate = function (models) {
    Establishment.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    Establishment.hasMany(models.InventoryStock, {
      foreignKey: 'establishment_id',
      as: 'stocks'
    });
    Establishment.hasMany(models.InventoryLog, {
      foreignKey: 'establishment_id',
      as: 'logs'
    });
  };

  return Establishment;
}