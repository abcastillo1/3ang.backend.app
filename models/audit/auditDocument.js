/**
 * AuditDocument = metadata of a file uploaded to B2/S3 (direct upload; API never reads the file).
 * Stores key, originalName, mimeType, size, category, uploader, optional link to project and node/folder.
 */
export default function (sequelize, DataTypes) {
  const AuditDocument = sequelize.define(
    'AuditDocument',
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
        allowNull: true,
        field: 'audit_project_id',
        comment: 'When document belongs to an audit project'
      },
      nodeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'node_id',
        comment: 'Optional: folder/node in tree (when audit_tree_node exists)'
      },
      commentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'comment_id',
        comment: 'If set, attachment of comment; evidence-only lists use comment_id IS NULL'
      },
      storageKey: {
        type: DataTypes.STRING(512),
        allowNull: false,
        field: 'storage_key',
        comment: 'Full key in B2/S3 (e.g. orgId/category/projectId/filename)'
      },
      originalName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'original_name'
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'mime_type'
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Size in bytes'
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'audit_evidences, fiscal_reports, company_docs, profiles'
      },
      uploaderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'uploader_id'
      },
      analysisStatus: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
        field: 'analysis_status',
        comment: 'IA analysis status (optional feature)'
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
        allowNull: true,
        field: 'deleted_at'
      }
    },
    {
      tableName: 'audit_documents',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['organization_id'] },
        { fields: ['audit_project_id'] },
        { fields: ['node_id'] },
        { fields: ['comment_id'] },
        { fields: ['uploader_id'] }
      ]
    }
  );

  AuditDocument.associate = function (models) {
    AuditDocument.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    AuditDocument.belongsTo(models.AuditProject, {
      foreignKey: 'audit_project_id',
      as: 'auditProject'
    });
    AuditDocument.belongsTo(models.User, {
      foreignKey: 'uploader_id',
      as: 'uploader'
    });
    AuditDocument.belongsTo(models.AuditTreeNode, {
      foreignKey: 'node_id',
      as: 'treeNode'
    });
    AuditDocument.belongsTo(models.ChecklistItemComment, {
      foreignKey: 'comment_id',
      as: 'comment'
    });
  };

  return AuditDocument;
}
