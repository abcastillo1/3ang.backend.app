import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import { throwError } from '../helpers/errors.js';
import modelsInstance from '../models/index.js';

export default async function validateSession(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.tokenRequired');
  }
  
  const token = authHeader.substring(7);
  const { UserSession } = modelsInstance.models;
  
  const session = await UserSession.findActiveByToken(token);
  
  if (!session) {
    throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.invalidSession');
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
