import { Sequelize } from 'sequelize';
import {
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  NODE_ENV
} from '../config/environment.js';
import { logger } from '../helpers/logger.js';

class Models {
  constructor() {
    this.sequelize = null;
    this.models = {};
  }

  async initialize() {
    const config = {
      host: DATABASE_HOST,
      port: DATABASE_PORT,
      dialect: 'mysql',
      logging: NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    };

    this.sequelize = new Sequelize(
      DATABASE_NAME,
      DATABASE_USER,
      DATABASE_PASSWORD,
      config
    );

    await this.loadModels();
    this.setAssociations();
    await this.testConnection();
  }

  async loadModels() {
    const organizationModule = await import('./organizations/organization.js');
    const OrganizationFactory = organizationModule.default;
    this.models.Organization = OrganizationFactory(this.sequelize, Sequelize.DataTypes);

    const organizationSettingModule = await import('./organizations/organizationSetting.js');
    const OrganizationSettingFactory = organizationSettingModule.default;
    this.models.OrganizationSetting = OrganizationSettingFactory(this.sequelize, Sequelize.DataTypes);

    const roleModule = await import('./roles/role.js');
    const RoleFactory = roleModule.default;
    this.models.Role = RoleFactory(this.sequelize, Sequelize.DataTypes);

    const permissionModule = await import('./permissions/permission.js');
    const PermissionFactory = permissionModule.default;
    this.models.Permission = PermissionFactory(this.sequelize, Sequelize.DataTypes);

    const rolePermissionModule = await import('./roles/rolePermission.js');
    const RolePermissionFactory = rolePermissionModule.default;
    this.models.RolePermission = RolePermissionFactory(this.sequelize, Sequelize.DataTypes);

    const userModule = await import('./users/user.js');
    const UserFactory = userModule.default;
    this.models.User = UserFactory(this.sequelize, Sequelize.DataTypes);

    const userSessionModule = await import('./users/userSession.js');
    const UserSessionFactory = userSessionModule.default;
    this.models.UserSession = UserSessionFactory(this.sequelize, Sequelize.DataTypes);

    const auditLogModule = await import('./audit/auditLog.js');
    const AuditLogFactory = auditLogModule.default;
    this.models.AuditLog = AuditLogFactory(this.sequelize, Sequelize.DataTypes);
  }

  setAssociations() {
    Object.keys(this.models).forEach(modelName => {
      if (this.models[modelName].associate) {
        this.models[modelName].associate(this.models);
      }
    });
  }

  async testConnection() {
    try {
      await this.sequelize.authenticate();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Error connecting to database:', error);
      throw error;
    }
  }

  async sync(options = {}) {
    return await this.sequelize.sync(options);
  }

  async close() {
    return await this.sequelize.close();
  }
}

const modelsInstance = new Models();

export default modelsInstance;
