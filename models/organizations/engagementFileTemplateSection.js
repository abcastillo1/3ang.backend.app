export default function (sequelize, DataTypes) {
  const EngagementFileTemplateSection = sequelize.define(
    'EngagementFileTemplateSection',
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
      tableName: 'engagement_file_template_sections',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['organization_id'] },
        { fields: ['parent_section_id'] },
        { unique: true, fields: ['organization_id', 'code'] }
      ]
    }
  );

  EngagementFileTemplateSection.associate = function (models) {
    EngagementFileTemplateSection.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
    EngagementFileTemplateSection.belongsTo(models.EngagementFileTemplateSection, { foreignKey: 'parentSectionId', as: 'parentSection' });
    EngagementFileTemplateSection.hasMany(models.EngagementFileTemplateSection, { foreignKey: 'parentSectionId', as: 'children' });
    EngagementFileTemplateSection.hasMany(models.EngagementFileTemplateItem, { foreignKey: 'templateSectionId', as: 'items' });
  };

  return EngagementFileTemplateSection;
}
