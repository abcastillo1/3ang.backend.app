export default function (sequelize, DataTypes) {
  const AuditTreeNode = sequelize.define(
    'AuditTreeNode',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      auditProjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'audit_project_id'
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'parent_id'
      },
      path: {
        type: DataTypes.STRING(760),
        allowNull: false,
        defaultValue: '/',
        comment: 'Materialized path e.g. /1/5/12'
      },
      depth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '0 = root, 1 = first level, etc.'
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'root, permanent_file, planning, programs, findings, reports, section, folder, etc.'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order',
        comment: 'Sort position among siblings'
      },
      refId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'ref_id',
        comment: 'Optional FK to a detail entity (ChecklistItem, Procedure, etc.)'
      },
      isSystemNode: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_system_node',
        comment: 'True for auto-created structure nodes that cannot be deleted'
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
      tableName: 'audit_tree_nodes',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['audit_project_id', 'parent_id'] },
        { fields: ['audit_project_id', 'path'] },
        { fields: ['audit_project_id', 'type'] }
      ]
    }
  );

  AuditTreeNode.MAX_DEPTH = null;

  AuditTreeNode.associate = function (models) {
    AuditTreeNode.belongsTo(models.AuditProject, {
      foreignKey: 'audit_project_id',
      as: 'auditProject'
    });
    AuditTreeNode.belongsTo(models.AuditTreeNode, {
      foreignKey: 'parent_id',
      as: 'parent'
    });
    AuditTreeNode.hasMany(models.AuditTreeNode, {
      foreignKey: 'parent_id',
      as: 'children'
    });
    AuditTreeNode.hasMany(models.AuditDocument, {
      foreignKey: 'node_id',
      as: 'documents'
    });
  };

  return AuditTreeNode;
}
