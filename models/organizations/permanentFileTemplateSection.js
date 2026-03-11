export default function (sequelize, DataTypes) {
  const PermanentFileTemplateSection = sequelize.define(
    'PermanentFileTemplateSection',
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
      tableName: 'permanent_file_template_sections',
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

  PermanentFileTemplateSection.associate = function (models) {
    PermanentFileTemplateSection.belongsTo(models.Organization, { foreignKey: 'organizationId', as: 'organization' });
    PermanentFileTemplateSection.belongsTo(models.PermanentFileTemplateSection, { foreignKey: 'parentSectionId', as: 'parentSection' });
    PermanentFileTemplateSection.hasMany(models.PermanentFileTemplateSection, { foreignKey: 'parentSectionId', as: 'children' });
    PermanentFileTemplateSection.hasMany(models.PermanentFileTemplateItem, { foreignKey: 'templateSectionId', as: 'items' });
  };

  return PermanentFileTemplateSection;
}
