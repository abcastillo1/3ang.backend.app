import { HTTP_STATUS } from '../../config/constants.js';
import modelsInstance from '../../models/index.js';

export default async function validateUserCreation(req, res, next) {
  const { data } = req.body;
  const { User, Role } = modelsInstance.models;

  const existingUser = await User.findByEmail(data.email);
  
  if (existingUser) {
    const error = new Error('User already exists');
    error.status = HTTP_STATUS.CONFLICT;
    error.code = 'users.emailExists';
    throw error;
  }

  const role = await Role.findByPk(data.roleId);
  
  if (!role || role.organizationId !== req.user.organizationId) {
    const error = new Error('Invalid role');
    error.status = HTTP_STATUS.BAD_REQUEST;
    error.code = 'users.invalidRole';
    throw error;
  }

  const existingDocument = await User.findOne({
    where: {
      organizationId: req.user.organizationId,
      documentType: data.documentType,
      documentNumber: data.documentNumber
    }
  });

  if (existingDocument) {
    const error = new Error('Document already exists');
    error.status = HTTP_STATUS.CONFLICT;
    error.code = 'users.documentExists';
    throw error;
  }

  if (data.username) {
    const existingUsername = await User.findOne({
      where: {
        organizationId: req.user.organizationId,
        username: data.username
      }
    });

    if (existingUsername) {
      const error = new Error('Username already exists');
      error.status = HTTP_STATUS.CONFLICT;
      error.code = 'users.usernameExists';
      throw error;
    }
  }

  next();
}
