export default function (sequelize, DataTypes) {
  const OrganizationSetting = sequelize.define(
    'OrganizationSetting',
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
      settingKey: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'setting_key'
      },
      settingValue: {
        type: DataTypes.TEXT,
        field: 'setting_value'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'organization_settings',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['organization_id', 'setting_key']
        }
      ]
    }
  );

  OrganizationSetting.associate = function (models) {
    OrganizationSetting.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
  };

  return OrganizationSetting;
}
