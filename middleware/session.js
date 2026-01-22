import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import modelsInstance from '../models/index.js';

export default async function validateSession(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication token required');
    error.status = HTTP_STATUS.UNAUTHORIZED;
    error.code = ERROR_CODES.UNAUTHORIZED;
    throw error;
  }
  
  const token = authHeader.substring(7);
  const { UserSession } = modelsInstance.models;
  
  const session = await UserSession.findActiveByToken(token);
  
  if (!session) {
    const error = new Error('Invalid or expired session');
    error.status = HTTP_STATUS.UNAUTHORIZED;
    error.code = ERROR_CODES.UNAUTHORIZED;
    throw error;
  }

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
  
  next();
}
