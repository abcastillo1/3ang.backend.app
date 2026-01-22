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
  const { UserSession, User } = modelsInstance.models;
  
  const session = await UserSession.findActiveByToken(token);
  
  if (session) {
    req.user = {
      id: session.user.id,
      email: session.user.email,
      organizationId: session.user.organizationId,
      roleId: session.user.roleId
    };
    req.session = session;
    
    if (!session.user.lastLoginAt) {
      await session.user.update({ lastLoginAt: new Date() });
    }
    
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.isActive) {
      const error = new Error('Invalid or inactive user');
      error.status = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.UNAUTHORIZED;
      throw error;
    }
    
    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
      roleId: user.roleId
    };
    
    next();
  } catch (err) {
    const error = new Error('Invalid or expired token');
    error.status = HTTP_STATUS.UNAUTHORIZED;
    error.code = ERROR_CODES.UNAUTHORIZED;
    throw error;
  }
}
