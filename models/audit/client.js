/**
 * Client = auditee (empresa o entidad a la que la firma le realiza la auditoría).
 * Belongs to Organization (audit firm).
 */
export default function (sequelize, DataTypes) {
  const Client = sequelize.define(
    'Client',
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
        allowNull: false,
        comment: 'Display name of the client'
      },
      legalName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'legal_name'
      },
      ruc: {
        type: DataTypes.STRING(13),
        allowNull: true,
        comment: 'RUC (Ecuador)'
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
      tableName: 'clients',
      paranoid: true,
      timestamps: true,
      underscored: true
    }
  );

  Client.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  Client.associate = function (models) {
    Client.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    Client.hasMany(models.AuditProject, {
      foreignKey: 'client_id',
      as: 'auditProjects'
    });
  };

  return Client;
}
