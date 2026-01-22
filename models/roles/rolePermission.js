export default function (sequelize, DataTypes) {
  const RolePermission = sequelize.define(
    'RolePermission',
    {
      roleId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'role_id'
      },
      permissionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        field: 'permission_id'
      }
    },
    {
      tableName: 'role_permissions',
      timestamps: false,
      underscored: true
    }
  );

  RolePermission.associate = function (models) {
    RolePermission.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });
    RolePermission.belongsTo(models.Permission, {
      foreignKey: 'permission_id',
      as: 'permission'
    });
  };

  return RolePermission;
}
