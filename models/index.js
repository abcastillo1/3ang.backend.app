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

    const clientModule = await import('./audit/client.js');
    const ClientFactory = clientModule.default;
    this.models.Client = ClientFactory(this.sequelize, Sequelize.DataTypes);

    const auditProjectModule = await import('./audit/auditProject.js');
    const AuditProjectFactory = auditProjectModule.default;
    this.models.AuditProject = AuditProjectFactory(this.sequelize, Sequelize.DataTypes);

    const projectAssignmentModule = await import('./audit/projectAssignment.js');
    const ProjectAssignmentFactory = projectAssignmentModule.default;
    this.models.ProjectAssignment = ProjectAssignmentFactory(this.sequelize, Sequelize.DataTypes);

    const auditDocumentModule = await import('./audit/auditDocument.js');
    const AuditDocumentFactory = auditDocumentModule.default;
    this.models.AuditDocument = AuditDocumentFactory(this.sequelize, Sequelize.DataTypes);

    const auditTreeNodeModule = await import('./audit/auditTreeNode.js');
    const AuditTreeNodeFactory = auditTreeNodeModule.default;
    this.models.AuditTreeNode = AuditTreeNodeFactory(this.sequelize, Sequelize.DataTypes);

    const activityLogModule = await import('./audit/activityLog.js');
    const ActivityLogFactory = activityLogModule.default;
    this.models.ActivityLog = ActivityLogFactory(this.sequelize, Sequelize.DataTypes);

    const permanentFileSectionModule = await import('./audit/permanentFileSection.js');
    const PermanentFileSectionFactory = permanentFileSectionModule.default;
    this.models.PermanentFileSection = PermanentFileSectionFactory(this.sequelize, Sequelize.DataTypes);

    const checklistItemModule = await import('./audit/checklistItem.js');
    const ChecklistItemFactory = checklistItemModule.default;
    this.models.ChecklistItem = ChecklistItemFactory(this.sequelize, Sequelize.DataTypes);

    const checklistItemAssigneeModule = await import('./audit/checklistItemAssignee.js');
    const ChecklistItemAssigneeFactory = checklistItemAssigneeModule.default;
    this.models.ChecklistItemAssignee = ChecklistItemAssigneeFactory(this.sequelize, Sequelize.DataTypes);

    const permanentFileTemplateSectionModule = await import('./organizations/permanentFileTemplateSection.js');
    const PermanentFileTemplateSectionFactory = permanentFileTemplateSectionModule.default;
    this.models.PermanentFileTemplateSection = PermanentFileTemplateSectionFactory(this.sequelize, Sequelize.DataTypes);

    const permanentFileTemplateItemModule = await import('./organizations/permanentFileTemplateItem.js');
    const PermanentFileTemplateItemFactory = permanentFileTemplateItemModule.default;
    this.models.PermanentFileTemplateItem = PermanentFileTemplateItemFactory(this.sequelize, Sequelize.DataTypes);
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
