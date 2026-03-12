export default function (sequelize, DataTypes) {
  const ChecklistItemAssignee = sequelize.define(
    'ChecklistItemAssignee',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      checklistItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'checklist_item_id'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      assignedByUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'assigned_by_user_id'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at'
      }
    },
    {
      tableName: 'checklist_item_assignees',
      paranoid: true,
      timestamps: true,
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['checklist_item_id', 'user_id'] },
        { fields: ['checklist_item_id'] },
        { fields: ['user_id'] }
      ]
    }
  );

  ChecklistItemAssignee.associate = function (models) {
    ChecklistItemAssignee.belongsTo(models.ChecklistItem, { foreignKey: 'checklistItemId', as: 'item' });
    ChecklistItemAssignee.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ChecklistItemAssignee.belongsTo(models.User, { foreignKey: 'assignedByUserId', as: 'assignedBy' });
  };

  return ChecklistItemAssignee;
}
