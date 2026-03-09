/**
 * ProjectAssignment = user assigned to an audit project (socio, encargado, miembro).
 */
export default function (sequelize, DataTypes) {
  const ProjectAssignment = sequelize.define(
    'ProjectAssignment',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      auditProjectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'audit_project_id'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      role: {
        type: DataTypes.ENUM('partner', 'manager', 'member'),
        defaultValue: 'member',
        comment: 'partner = socio, manager = encargado, member = miembro'
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      }
    },
    {
      tableName: 'project_assignments',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['audit_project_id', 'user_id'],
          name: 'project_assignments_project_user_unique'
        }
      ]
    }
  );

  ProjectAssignment.associate = function (models) {
    ProjectAssignment.belongsTo(models.AuditProject, {
      foreignKey: 'audit_project_id',
      as: 'auditProject'
    });
    ProjectAssignment.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return ProjectAssignment;
}
