export default function (sequelize, DataTypes) {
  const AuditCrossReference = sequelize.define(
    'AuditCrossReference',
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
      auditProjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'audit_project_id'
      },
      sourceKind: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'source_kind'
      },
      sourceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'source_id'
      },
      targetKind: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'target_kind'
      },
      targetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'target_id'
      },
      relationType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'related',
        field: 'relation_type'
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'created_by_user_id'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      }
    },
    {
      tableName: 'audit_cross_references',
      timestamps: true,
      underscored: true
    }
  );

  AuditCrossReference.associate = function (models) {
    AuditCrossReference.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    AuditCrossReference.belongsTo(models.AuditProject, {
      foreignKey: 'audit_project_id',
      as: 'auditProject'
    });
    AuditCrossReference.belongsTo(models.User, {
      foreignKey: 'created_by_user_id',
      as: 'author'
    });
  };

  return AuditCrossReference;
}
