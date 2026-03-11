export default function (sequelize, DataTypes) {
  const PermanentFileTemplateItem = sequelize.define(
    'PermanentFileTemplateItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      templateSectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'template_section_id'
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
      tableName: 'permanent_file_template_items',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['template_section_id'] },
        { unique: true, fields: ['template_section_id', 'code'] }
      ]
    }
  );

  PermanentFileTemplateItem.associate = function (models) {
    PermanentFileTemplateItem.belongsTo(models.PermanentFileTemplateSection, { foreignKey: 'templateSectionId', as: 'templateSection' });
  };

  return PermanentFileTemplateItem;
}
