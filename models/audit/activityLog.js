export default function (sequelize, DataTypes) {
  const ActivityLog = sequelize.define(
    'ActivityLog',
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
        allowNull: false,
        field: 'user_id'
      },
      auditProjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'audit_project_id'
      },
      action: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      entity: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'entity_id'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'activity_logs',
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['organization_id', 'created_at'] },
        { fields: ['audit_project_id', 'created_at'] },
        { fields: ['user_id', 'created_at'] },
        { fields: ['organization_id', 'entity', 'entity_id'] }
      ]
    }
  );

  ActivityLog.associate = function (models) {
    ActivityLog.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
    ActivityLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ActivityLog.belongsTo(models.AuditProject, { foreignKey: 'auditProjectId', as: 'auditProject' });
  };

  return ActivityLog;
}
