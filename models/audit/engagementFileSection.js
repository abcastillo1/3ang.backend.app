export default function (sequelize, DataTypes) {
  const EngagementFileSection = sequelize.define(
    'EngagementFileSection',
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
      parentSectionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'parent_section_id'
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas o contexto de la carpeta'
      },
      priority: {
        type: DataTypes.STRING(10),
        allowNull: true
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'sort_order'
      },
      treeNodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'tree_node_id',
        comment: 'AuditTreeNode for this section so tree/full is single hierarchy'
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
      tableName: 'engagement_file_sections',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['audit_project_id'] },
        { fields: ['parent_section_id'] },
        { unique: true, fields: ['audit_project_id', 'code'] }
      ]
    }
  );

  EngagementFileSection.associate = function (models) {
    EngagementFileSection.belongsTo(models.AuditTreeNode, { foreignKey: 'treeNodeId', as: 'treeNode' });
    EngagementFileSection.belongsTo(models.AuditProject, { foreignKey: 'auditProjectId', as: 'auditProject' });
    EngagementFileSection.belongsTo(models.EngagementFileSection, { foreignKey: 'parentSectionId', as: 'parentSection' });
    EngagementFileSection.hasMany(models.EngagementFileSection, { foreignKey: 'parentSectionId', as: 'children' });
    EngagementFileSection.hasMany(models.ChecklistItem, { foreignKey: 'sectionId', as: 'items' });
  };

  return EngagementFileSection;
}
