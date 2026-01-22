export default function (sequelize, DataTypes) {
  const UserSession = sequelize.define(
    'UserSession',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: false
      },
      ipAddress: {
        type: DataTypes.STRING(50),
        field: 'ip_address'
      },
      userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent'
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'expires_at'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      }
    },
    {
      tableName: 'user_sessions',
      timestamps: true,
      underscored: true
    }
  );

  UserSession.associate = function (models) {
    UserSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  UserSession.prototype.isExpired = function () {
    return new Date() > this.expiresAt;
  };

  UserSession.findActiveByToken = async function (token) {
    const session = await this.findOne({
      where: { token },
      include: [{
        model: this.sequelize.models.User,
        as: 'user',
        where: { isActive: true },
        required: true
      }]
    });

    if (!session || session.isExpired()) {
      return null;
    }

    return session;
  };

  return UserSession;
}
