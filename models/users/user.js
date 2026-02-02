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

  User.findByUsername = async function (username) {
    return await this.findOne({ where: { username } });
  };

  User.findWithProfile = async function (userId) {
    const { Organization, Role, Permission } = this.sequelize.models;
    
    return await this.findByPk(userId, {
      include: [
        {
          model: Organization,
          as: 'organization',
          attributes: ['id', 'name', 'legalName', 'taxId', 'email', 'phone', 'address', 'country', 'city', 'isActive', 'ownerUserId']
        },
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'description', 'isSystem'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['id', 'code', 'description', 'module'],
              through: { attributes: [] }
            }
          ]
        }
      ]
    });
  };

  User.prototype.getProfile = async function () {
    let userWithRelations = this;
    
    if (!this.organization || !this.role) {
      userWithRelations = await this.constructor.findWithProfile(this.id);
      if (!userWithRelations) {
        return null;
      }
    }

    const organization = userWithRelations.organization;
    const role = userWithRelations.role;

    const isOwner = organization && organization.ownerUserId === this.id;

    const permissions = role && role.permissions 
      ? role.permissions.map(p => ({
          id: p.id,
          code: p.code,
          description: p.description,
          module: p.module
        }))
      : [];

    const userData = {
      id: this.id,      
      fullName: this.fullName,
      username: this.username,
      email: this.email,
      phone: this.phone,
      documentType: this.documentType,
      documentNumber: this.documentNumber,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };

    const organizationData = organization ? {
      id: organization.id,
      name: organization.name,
      legalName: organization.legalName,
      taxId: organization.taxId,
      email: organization.email,
      phone: organization.phone,
      address: organization.address,
      isActive: organization.isActive,
      isOwner: isOwner
    } : null;

    const roleData = role ? {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem
    } : null;

    return {
      user: userData,
      organization: organizationData,
      role: roleData,
      permissions: permissions,
      isOwner: isOwner
    };
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
    User.hasMany(models.InventoryLog, {
      foreignKey: 'user_id',
      as: 'inventoryLogs'
    });
  };

  return User;
}
