export default function (sequelize, DataTypes) {
  const Role = sequelize.define(
    'Role',
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
        type: DataTypes.STRING(50),
        allowNull: false
      },
      description: {
        type: DataTypes.STRING(255)
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_system'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'roles',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['organization_id', 'name']
        }
      ]
    }
  );

  Role.associate = function (models) {
    Role.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    Role.hasMany(models.User, {
      foreignKey: 'role_id',
      as: 'users'
    });
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: 'role_id',
      otherKey: 'permission_id',
      as: 'permissions'
    });
  };

  Role.prototype.hasPermission = async function (permissionCode) {
    const rolePermissions = await this.getPermissions({
      where: { code: permissionCode }
    });
    return rolePermissions.length > 0;
  };

  return Role;
}
