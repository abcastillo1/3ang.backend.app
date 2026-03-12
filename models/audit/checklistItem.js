export default function (sequelize, DataTypes) {
  const ChecklistItem = sequelize.define(
    'ChecklistItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      sectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'section_id'
      },
      createdByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'created_by_user_id',
        comment: 'Usuario que creó el ítem'
      },
      code: {
        type: DataTypes.STRING(30),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      isRequired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_required'
      },
      ref: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'pending'
      },
      assignedUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_user_id',
        comment: 'Primer asignado (compat); lista completa en checklist_item_assignees'
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
        comment: 'Nodo hoja; todos los documentos del ítem usan audit_documents.node_id = treeNodeId'
      },
      lastReviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_reviewed_at'
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
      tableName: 'checklist_items',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['section_id'] },
        { fields: ['section_id', 'status'] },
        { fields: ['assigned_user_id'] },
        { fields: ['created_by_user_id'] },
        { unique: true, fields: ['section_id', 'code'] }
      ]
    }
  );

  ChecklistItem.STATUSES = ['pending', 'in_review', 'compliant', 'not_applicable'];

  ChecklistItem.associate = function (models) {
    ChecklistItem.belongsTo(models.AuditTreeNode, { foreignKey: 'treeNodeId', as: 'treeNode' });
    ChecklistItem.belongsTo(models.EngagementFileSection, { foreignKey: 'sectionId', as: 'section' });
    ChecklistItem.belongsTo(models.User, { foreignKey: 'assignedUserId', as: 'assignedUser' });
    ChecklistItem.belongsTo(models.User, { foreignKey: 'createdByUserId', as: 'createdBy' });
    ChecklistItem.hasMany(models.ChecklistItemAssignee, { foreignKey: 'checklistItemId', as: 'assignees' });
    ChecklistItem.hasMany(models.ChecklistItemComment, { foreignKey: 'checklistItemId', as: 'comments' });
  };

  return ChecklistItem;
}
