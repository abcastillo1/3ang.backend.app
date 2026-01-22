import { validateField } from '../../../helpers/validator.js';
import apiResponse from '../../../helpers/response.js';
import validateRequest from '../../../middleware/validation.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../../config/environment.js';
import { HTTP_STATUS, ERROR_CODES } from '../../../config/constants.js';
import modelsInstance from '../../../models/index.js';

const validators = [
  validateField('data.email')
    .isEmail()
    .withMessage('validators.email.invalid')
    .notEmpty()
    .withMessage('validators.email.required'),
  validateField('data.password')
    .notEmpty()
    .withMessage('validators.password.required')
    .isLength({ min: 6 })
    .withMessage('validators.password.minLength'),
  validateRequest
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { User, UserSession } = modelsInstance.models;

  const user = await User.findByEmail(data.email);

  if (!user) {
    const error = new Error('Invalid credentials');
    error.status = HTTP_STATUS.UNAUTHORIZED;
    error.code = 'auth.invalidCredentials';
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('User inactive');
    error.status = HTTP_STATUS.FORBIDDEN;
    error.code = 'auth.userInactive';
    throw error;
  }

  const isValidPassword = await user.verifyPassword(data.password);

  if (!isValidPassword) {
    const error = new Error('Invalid credentials');
    error.status = HTTP_STATUS.UNAUTHORIZED;
    error.code = 'auth.invalidCredentials';
    throw error;
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
    roleId: user.roleId
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const expiresAt = new Date();
  const expiresInHours = JWT_EXPIRES_IN.includes('h') 
    ? parseInt(JWT_EXPIRES_IN.replace('h', '')) 
    : 24;
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  await UserSession.create({
    userId: user.id,
    token,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    expiresAt
  });

  await user.update({ lastLoginAt: new Date() });

  const { AuditLog } = modelsInstance.models;
  
  await AuditLog.createLog({
    organizationId: user.organizationId,
    userId: user.id,
    action: 'login',
    entity: 'auth',
    entityId: user.id,
    metadata: {
      method: 'POST',
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    }
  }).catch(err => {
    console.error('Error creating audit log:', err);
  });

  const response = {
    token,
    user: user.toPublicJSON()
  };

  return apiResponse(res, req, next)(response);
}

const loginRoute = {
  validators,
  default: handler,
  action: 'login',
  entity: 'auth'
};

export default loginRoute;
export { validators };
