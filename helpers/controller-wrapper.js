import { logger } from './logger.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import modelsInstance from '../models/index.js';

/**
 * Executes a middleware function, handling both async (Promise) and callback-based patterns.
 * This is necessary because some middlewares like multer use callbacks while others use Promises.
 */
function executeMiddleware(middleware, req, res) {
  return new Promise((resolve, reject) => {
    const result = middleware(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    
    // If middleware returns a Promise (async middleware), use it instead of callback
    if (result && typeof result.then === 'function') {
      result.then(resolve).catch(reject);
    }
    // Otherwise, wait for callback to be called (multer pattern)
  });
}

export function registerRoute(router, path, routeModule, method = 'post') {
  const validators = routeModule.validators || [];
  const handler = routeModule.default;
  const skipAudit = routeModule.skipAudit === true;

  if (!handler) {
    throw new Error(`Route module ${path} must export a default function`);
  }

  router[method](path, async (req, res, next) => {
    const originalJson = res.json.bind(res);
    let responseData = null;
    let responseStatus = HTTP_STATUS.OK;

    res.json = function (data) {
      responseData = data;
      responseStatus = res.statusCode || HTTP_STATUS.OK;
      return originalJson(data);
    };

    try {
      for (const validator of validators) {
        if (typeof validator === 'function') {
          await executeMiddleware(validator, req, res);
        } else if (Array.isArray(validator)) {
          await Promise.all(validator.map(v => v.run(req)));
        } else {
          await validator.run(req);
        }
      }

      await handler(req, res, next);

      if (!skipAudit && responseStatus < 400 && req.user && req.user.id) {
        createAuditLogAsync({
          path,
          method,
          routeModule,
          req,
          responseData,
          responseStatus
        });
      }
    } catch (error) {
      logger.error('Error in controller', {
        path,
        method,
        error: error.message,
        stack: error.stack
      });

      if (error.name === 'MulterError') {
        let errorCode = 'files.upload.failed';
        
        if (error.code === 'LIMIT_FILE_SIZE') {
          errorCode = 'files.size.exceeded';
        } else if (error.code === 'LIMIT_FILE_COUNT') {
          errorCode = 'files.count.exceeded';
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          errorCode = 'files.field.invalid';
        }
        
        const message = req.translate ? req.translate(errorCode) : errorCode;
        
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          statusCode: HTTP_STATUS.BAD_REQUEST,
          message,
          errorCode
        });
      }

      if (error.status && error.code) {
        const statusCode = error.status;
        const errorCode = error.code;
        const translationOptions = error.translationOptions || {};
        const message = req.translate ? req.translate(errorCode, translationOptions) : errorCode;
        
        const response = {
          statusCode,
          message,
          errorCode
        };

        if (error.errors) {
          response.errors = error.errors;
        }

        return res.status(statusCode).json(response);
      }

      const message = req.translate ? req.translate(ERROR_CODES.INTERNAL_ERROR) : 'Internal server error';
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message,
        errorCode: ERROR_CODES.INTERNAL_ERROR
      });
    }
  });
}

function getActionFromPath(path, method) {
  const pathLower = path.toLowerCase();
  
  if (pathLower.includes('login')) return 'login';
  if (pathLower.includes('logout')) return 'logout';
  if (pathLower.includes('create') || pathLower.includes('register')) return 'create';
  if (pathLower.includes('update') || pathLower.includes('edit')) return 'update';
  if (pathLower.includes('delete') || pathLower.includes('remove')) return 'delete';
  if (pathLower.includes('list') || pathLower.includes('get')) return 'list';
  if (pathLower.includes('profile')) return 'view';
  if (pathLower.includes('organization')) return 'view';
  
  return method === 'post' ? 'execute' : 'view';
}

function getEntityFromPath(path) {
  const parts = path.split('/').filter(p => p);
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }
  return 'unknown';
}

function getEntityIdFromResponse(responseData) {
  if (responseData?.data?.id) return responseData.data.id;
  if (responseData?.data?.user?.id) return responseData.data.user.id;
  if (responseData?.data?.organization?.id) return responseData.data.organization.id;
  return null;
}

function getEntityIdFromBody(body) {
  if (body?.data?.id) return body.data.id;
  return null;
}

function createAuditLogAsync({ path, method, routeModule, req, responseData, responseStatus }) {
  setImmediate(async () => {
    try {
      const { AuditLog } = modelsInstance.models;
      const action = routeModule.action || getActionFromPath(path, method);
      const entity = routeModule.entity || getEntityFromPath(path);
      const entityId = getEntityIdFromResponse(responseData) || getEntityIdFromBody(req.body);

      await AuditLog.createLog({
        organizationId: req.user.organizationId || req.organization?.id,
        userId: req.user.id,
        action,
        entity,
        entityId,
        metadata: {
          method: method.toUpperCase(),
          path: req.path,
          route: path,
          ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
          userAgent: req.get('user-agent'),
          body: req.body ? sanitizeBody(req.body) : null,
          responseStatus
        }
      });
    } catch (err) {
      logger.error('Error creating audit log', {
        error: err.message,
        path,
        method
      });
    }
  });
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return null;
  
  const sanitized = { ...body };
  
  if (sanitized.data) {
    sanitized.data = { ...sanitized.data };
    if (sanitized.data.password) {
      sanitized.data.password = '***REDACTED***';
    }
    if (sanitized.data.passwordHash) {
      sanitized.data.passwordHash = '***REDACTED***';
    }
  }
  
  return sanitized;
}
