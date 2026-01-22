import { logger } from './logger.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

export function registerRoute(router, path, routeModule, method = 'post') {
  const validators = routeModule.validators || [];
  const handler = routeModule.default;

  if (!handler) {
    throw new Error(`Route module ${path} must export a default function`);
  }

  router[method](path, async (req, res, next) => {
    try {
      for (const validator of validators) {
        if (typeof validator === 'function') {
          await validator(req, res, (err) => {
            if (err) {
              throw err;
            }
          });
        } else if (Array.isArray(validator)) {
          await Promise.all(validator.map(v => v.run(req)));
        } else {
          await validator.run(req);
        }
      }

      await handler(req, res, next);
    } catch (error) {
      logger.error('Error in controller', {
        path,
        method,
        error: error.message,
        stack: error.stack
      });

      if (error.status && error.code) {
        const statusCode = error.status;
        const errorCode = error.code;
        const message = req.translate ? req.translate(errorCode) : errorCode;
        
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
