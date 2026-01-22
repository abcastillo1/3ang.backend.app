import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/environment.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import modelsInstance from '../models/index.js';

export default async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication token required');
    error.status = HTTP_STATUS.UNAUTHORIZED;
    error.code = ERROR_CODES.UNAUTHORIZED;
    throw error;
  }
  
  const token = authHeader.substring(7);
  const { UserSession, User, Organization } = modelsInstance.models;
  
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
        const error = new Error('Invalid or inactive user');
        error.status = HTTP_STATUS.UNAUTHORIZED;
        error.code = ERROR_CODES.UNAUTHORIZED;
        throw error;
      }
    } catch (err) {
      const error = new Error('Invalid or expired token');
      error.status = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.UNAUTHORIZED;
      throw error;
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
