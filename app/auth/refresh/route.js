import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../../config/environment.js';
import { HTTP_STATUS, ERROR_CODES } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  authenticate
];

async function handler(req, res, next) {
  const { UserSession } = modelsInstance.models;
  const currentToken = req.headers.authorization?.substring(7);
  
  let session = req.session;
  
  if (!session) {
    session = await UserSession.findOne({
      where: { token: currentToken },
      include: [{
        model: modelsInstance.models.User,
        as: 'user',
        where: { isActive: true },
        required: true
      }]
    });

    if (!session || session.isExpired()) {
      throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.invalidSession');
    }
  }

  const tokenPayload = {
    id: req.user.id,
    email: req.user.email,
    organizationId: req.user.organizationId,
    roleId: req.user.roleId
  };

  const newToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const expiresAt = new Date();
  const expiresInHours = JWT_EXPIRES_IN.includes('h') 
    ? parseInt(JWT_EXPIRES_IN.replace('h', '')) 
    : 24;
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  await session.update({
    token: newToken,
    expiresAt
  });

  const response = {
    token: newToken,
    expiresAt: expiresAt.toISOString()
  };

  return apiResponse(res, req, next)(response);
}

const refreshRoute = {
  validators,
  default: handler,
  action: 'refresh',
  entity: 'auth'
};

export default refreshRoute;
export { validators };
