export default function (sequelize, DataTypes) {
  const Permission = sequelize.define(
    'Permission',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.STRING(255)
      },
      module: {
        type: DataTypes.STRING(100)
      }
    },
    {
      tableName: 'permissions',
      timestamps: false
    }
  );

  Permission.associate = function (models) {
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: 'permission_id',
      otherKey: 'role_id',
      as: 'roles'
    });
  };

  return Permission;
}
