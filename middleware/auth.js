import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/environment.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { throwError } from '../helpers/errors.js';
import modelsInstance from '../models/index.js';

export default async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.tokenRequired');
  }
  
  const token = authHeader.substring(7);
  const { UserSession, User, Organization, Establishment } = modelsInstance.models;
  
  let userModel = null;
  
  const session = await UserSession.findActiveByToken(token);
  
  if (session) {
    userModel = session.user;
    req.session = session;
    
    if (!userModel.lastLoginAt) {
      await userModel.update({ lastLoginAt: new Date() });
    }
  } else {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userModel = await User.findByPk(decoded.id, {
        include: [{
          model: Organization,
          as: 'organization'
        }]
      });
      
      if (!userModel || !userModel.isActive) {
        throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.invalidOrInactiveUser');
      }
    } catch (err) {
      throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.invalidOrExpiredToken');
    }
  }
  
  if (!userModel.organization) {
    userModel = await User.findByPk(userModel.id, {
      include: [{
        model: Organization,
        as: 'organization'
      }]
    });
  }
  
  req.user = {
    id: userModel.id,
    email: userModel.email,
    organizationId: userModel.organizationId,
    roleId: userModel.roleId
  };
  
  req.userModel = userModel;
  req.organization = userModel.organization;
  
  next();
}
