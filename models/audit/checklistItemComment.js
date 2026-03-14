/**
 * Comentario en un ítem de checklist (texto + adjuntos vía audit_documents.comment_id).
 * mention_user_ids: JSON array de ids para notificaciones sin subconsultas.
 * attachment_count: denormalizado al vincular/desvincular docs al comentario.
 */
export default function (sequelize, DataTypes) {
  const ChecklistItemComment = sequelize.define(
    'ChecklistItemComment',
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
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      authorUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'author_user_id'
      },
      mentionUserIds: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'mention_user_ids',
        comment: 'Array of { id, fullName, email } from front; list returns it; notifications use .map(m => m.id)'
      },
      attachmentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'attachment_count'
      },
      createdAt: { type: DataTypes.DATE, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, field: 'updated_at' },
      deletedAt: { type: DataTypes.DATE, field: 'deleted_at' }
    },
    {
      tableName: 'checklist_item_comments',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['checklist_item_id'] },
        { fields: ['audit_project_id'] },
        { fields: ['parent_id'] }
      ]
    }
  );

  ChecklistItemComment.associate = function (models) {
    ChecklistItemComment.belongsTo(models.ChecklistItem, {
      foreignKey: 'checklistItemId',
      as: 'checklistItem'
    });
    ChecklistItemComment.belongsTo(models.AuditProject, {
      foreignKey: 'auditProjectId',
      as: 'auditProject'
    });
    ChecklistItemComment.belongsTo(models.ChecklistItemComment, {
      foreignKey: 'parentId',
      as: 'parent'
    });
    ChecklistItemComment.belongsTo(models.User, {
      foreignKey: 'authorUserId',
      as: 'author'
    });
    ChecklistItemComment.hasMany(models.AuditDocument, {
      foreignKey: 'commentId',
      as: 'attachments'
    });
  };

  return ChecklistItemComment;
}
