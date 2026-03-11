/**
 * AuditProject = engagement / project (encargo de auditoría).
 * One per client and period (e.g. annual audit). Has assignments, documents, and later: tree nodes, findings, reports.
 */
export default function (sequelize, DataTypes) {
  const AuditProject = sequelize.define(
    'AuditProject',
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
      clientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'client_id'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Project name (e.g. "Auditoría 2024 - Cliente XYZ")'
      },
      auditType: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'audit_type',
        comment: 'e.g. financial, compliance, operational'
      },
      periodStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'period_start',
        comment: 'Start of audited period'
      },
      periodEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'period_end',
        comment: 'End of audited period'
      },
      status: {
        type: DataTypes.ENUM('draft', 'planning', 'in_progress', 'review', 'closed'),
        defaultValue: 'draft',
        comment: 'Project lifecycle status'
      },
      sourceAuditProjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'source_audit_project_id',
        comment: 'When replicated from another project'
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
      tableName: 'audit_projects',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['organization_id', 'client_id'] },
        { fields: ['status'] }
      ]
    }
  );

  AuditProject.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  AuditProject.associate = function (models) {
    AuditProject.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    AuditProject.belongsTo(models.Client, {
      foreignKey: 'client_id',
      as: 'client'
    });
    AuditProject.belongsTo(models.AuditProject, {
      foreignKey: 'source_audit_project_id',
      as: 'sourceProject'
    });
    AuditProject.hasMany(models.ProjectAssignment, {
      foreignKey: 'audit_project_id',
      as: 'assignments'
    });
    AuditProject.hasMany(models.AuditDocument, {
      foreignKey: 'audit_project_id',
      as: 'documents'
    });
    AuditProject.hasMany(models.AuditTreeNode, {
      foreignKey: 'audit_project_id',
      as: 'treeNodes'
    });
    AuditProject.hasMany(models.ActivityLog, {
      foreignKey: 'audit_project_id',
      as: 'activityLogs'
    });
    AuditProject.hasMany(models.PermanentFileSection, {
      foreignKey: 'audit_project_id',
      as: 'permanentFileSections'
    });
  };

  return AuditProject;
}
