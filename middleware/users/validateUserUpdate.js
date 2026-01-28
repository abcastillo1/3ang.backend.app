import { HTTP_STATUS } from '../../config/constants.js';
import { throwError } from '../../helpers/errors.js';
import modelsInstance from '../../models/index.js';
import { Op } from 'sequelize';

export default async function validateUserUpdate(req, res, next) {
  const { data } = req.body;
  const { User, Role } = modelsInstance.models;
  const authenticatedUser = req.userModel;
  
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined && typeof data[key] === 'string') {
      data[key] = data[key].trim();
      if (data[key] === '') {
        data[key] = null;
      }
    }
  });

  let userToUpdate = authenticatedUser;
  
  if (data.id !== undefined) {
    const targetUser = await User.findByPk(data.id);
    
    if (!targetUser) {
      throwError(HTTP_STATUS.NOT_FOUND, 'users.userNotFound');
    }
    
    if (targetUser.organizationId !== authenticatedUser.organizationId) {
      throwError(HTTP_STATUS.FORBIDDEN, 'users.cannotUpdateOtherOrganization');
    }
    
    userToUpdate = targetUser;
  }
  
  const isOwner = req.organization && req.organization.ownerUserId === userToUpdate.id;
  
  if (data.isActive === false && isOwner && authenticatedUser.id !== userToUpdate.id) {
    throwError(HTTP_STATUS.FORBIDDEN, 'users.cannotDeactivateOwner');
  }
  
  if (data.email !== undefined && data.email !== userToUpdate.email && data.email) {
    const existingUser = await User.findByEmail(data.email);
    if (existingUser && existingUser.id !== userToUpdate.id) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'users.emailExists');
    }
  }
  
  if (data.username !== undefined && data.username !== userToUpdate.username && data.username) {
    const existingUser = await User.findByUsername(data.username);
    if (existingUser) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'users.usernameExists');
    }
  }
  

  if (data.documentNumber !== undefined || data.documentType !== undefined) {
    const documentType = data.documentType !== undefined ? data.documentType : userToUpdate.documentType;
    const documentNumber = data.documentNumber !== undefined ? data.documentNumber : userToUpdate.documentNumber;
    
    if (documentNumber !== userToUpdate.documentNumber || documentType !== userToUpdate.documentType) {
      const existingUser = await User.findOne({
        where: {
          organizationId: userToUpdate.organizationId,
          documentType: documentType,
          documentNumber: documentNumber,
          id: { [Op.ne]: userToUpdate.id }
        }
      });
      
      if (existingUser) {
        throwError(HTTP_STATUS.BAD_REQUEST, 'users.documentExists');
      }
    }
  }

  if (data.roleId !== undefined && data.roleId !== userToUpdate.roleId) {
    const role = await Role.findByPk(data.roleId);
    
    if (!role) {
      throwError(HTTP_STATUS.NOT_FOUND, 'roles.notFound');
    }
    
    if (role.organizationId !== authenticatedUser.organizationId) {
      throwError(HTTP_STATUS.BAD_REQUEST, 'users.invalidRole');
    }
  }
  
  const updateData = {};
  const fieldMappings = {
    fullName: 'fullName',
    username: 'username',
    email: 'email',
    phone: 'phone',
    documentType: 'documentType',
    documentNumber: 'documentNumber',
    password: 'passwordHash',
    isActive: 'isActive',
    roleId: 'roleId'
  };
  
  Object.keys(fieldMappings).forEach(key => {
    if (data[key] !== undefined) {
      const dbField = fieldMappings[key];
      updateData[dbField] = data[key];
    }
  });

  req.userToUpdate = userToUpdate;
  req.updateData = updateData;
  
  next();
}
