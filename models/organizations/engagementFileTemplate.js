export default function (sequelize, DataTypes) {
  const EngagementFileTemplate = sequelize.define(
    'EngagementFileTemplate',
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_default'
      },
      projectTreeSnapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'project_tree_snapshot'
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
      tableName: 'engagement_file_templates',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['organization_id'] }]
    }
  );

  EngagementFileTemplate.associate = function (models) {
    EngagementFileTemplate.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
    EngagementFileTemplate.hasMany(models.EngagementFileTemplateSection, { foreignKey: 'templateId', as: 'sections' });
  };

  return EngagementFileTemplate;
}
