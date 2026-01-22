export default function (sequelize, DataTypes) {
  const AuditLog = sequelize.define(
    'AuditLog',
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
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id'
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      entity: {
        type: DataTypes.STRING(100)
      },
      entityId: {
        type: DataTypes.INTEGER,
        field: 'entity_id'
      },
      metadata: {
        type: DataTypes.JSON
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'audit_logs',
      timestamps: true,
      underscored: true
    }
  );

  AuditLog.associate = function (models) {
    AuditLog.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    AuditLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  AuditLog.createLog = async function (data) {
    return await this.create({
      organizationId: data.organizationId,
      userId: data.userId || null,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId || null,
      metadata: data.metadata || null
    });
  };

  return AuditLog;
}
