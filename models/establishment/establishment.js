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
