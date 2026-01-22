import bcrypt from 'bcryptjs';

export default function (sequelize, DataTypes) {
  const User = sequelize.define(
    'User',
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
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'role_id'
      },
      fullName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'full_name'
      },
      username: {
        type: DataTypes.STRING(100)
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      phone: {
        type: DataTypes.STRING(50)
      },
      documentType: {
        type: DataTypes.ENUM('cedula', 'ruc', 'pasaporte'),
        allowNull: false,
        field: 'document_type'
      },
      documentNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'document_number'
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        field: 'last_login_at'
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
      tableName: 'users',
      paranoid: true,
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['organization_id', 'username']
        },
        {
          unique: true,
          fields: ['organization_id', 'document_type', 'document_number']
        }
      ]
    }
  );

  User.beforeSave(async (user) => {
    if (user.changed('passwordHash')) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
    }
  });

  User.prototype.verifyPassword = async function (password) {
    return await bcrypt.compare(password, this.passwordHash);
  };

  User.prototype.toPublicJSON = function () {
    const values = { ...this.toJSON() };
    delete values.passwordHash;
    return values;
  };

  User.prototype.hasPermission = async function (permissionCode) {
    const role = await this.getRole({
      include: [{
        model: this.sequelize.models.Permission,
        as: 'permissions',
        where: { code: permissionCode },
        required: false
      }]
    });
    
    if (!role) return false;
    
    const permissions = role.permissions || [];
    return permissions.length > 0;
  };

  User.findByEmail = async function (email) {
    return await this.findOne({ where: { email } });
  };

  User.prototype.softDelete = async function () {
    return await this.update({ deletedAt: new Date() });
  };

  User.associate = function (models) {
    User.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role'
    });
    User.hasMany(models.UserSession, {
      foreignKey: 'user_id',
      as: 'sessions'
    });
    User.hasMany(models.AuditLog, {
      foreignKey: 'user_id',
      as: 'auditLogs'
    });
  };

  return User;
}
