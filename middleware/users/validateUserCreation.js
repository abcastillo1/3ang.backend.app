import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';

export default async function validateUserCreation(req, res, next) {
  const { data } = req.body;
  const { User, Role } = modelsInstance.models;

  const existingUser = await User.findByEmail(data.email);
  
  if (existingUser) {
    throwError(HTTP_STATUS.CONFLICT, 'users.emailExists');
  }

  const role = await Role.findByPk(data.roleId);
  
  if (!role || role.organizationId !== req.user.organizationId) {
    throwError(HTTP_STATUS.BAD_REQUEST, 'users.invalidRole');
  }

  const existingDocument = await User.findOne({
    where: {
      organizationId: req.user.organizationId,
      documentType: data.documentType,
      documentNumber: data.documentNumber
    }
  });

  if (existingDocument) {
    throwError(HTTP_STATUS.CONFLICT, 'users.documentExists');
  }

  if (data.username) {
    const existingUsername = await User.findByUsername(data.username);

    if (existingUsername) {
      throwError(HTTP_STATUS.CONFLICT, 'users.usernameExists');
    }
  }

  next();
}
