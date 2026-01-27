import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import validateRequest from '../../../middleware/validation.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';
import { logger } from '../../../helpers/logger.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { UserSession, AuditLog } = modelsInstance.models;
  const token = req.headers.authorization?.substring(7);
  
  if (!token) {
    throwError(HTTP_STATUS.BAD_REQUEST, 'auth.tokenRequired');
  }

  const session = await UserSession.findOne({
    where: { token }
  });

  if (session) {
    await session.destroy();
  }

  await AuditLog.createLog({
    organizationId: req.user.organizationId,
    userId: req.user.id,
    action: 'logout',
    entity: 'auth',
    entityId: req.user.id,
    metadata: {
      method: 'POST',
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    }
  }).catch(err => {
    logger.error('Error creating audit log for logout', { error: err.message, userId: req.user.id });
  });

  const response = {
    message: 'Logged out successfully'
  };

  return apiResponse(res, req, next)(response);
}

const logoutRoute = {
  validators,
  default: handler,
  action: 'logout',
  entity: 'auth'
};

export default logoutRoute;
export { validators };
