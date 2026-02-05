import { HTTP_STATUS } from '../config/constants.js';

export default function apiResponse(res, req, next) {
  return (data = null, error = null) => {
    if (error) {
      const statusCode = error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const errorCode = error.code || 'server.internalError';
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

    const statusCode = data ? HTTP_STATUS.OK : HTTP_STATUS.NO_CONTENT;
    const message = req.translate ? req.translate('response.success') : 'Operation successful';

    return res.status(statusCode).json({
      statusCode,
      message,
      data
    });
  };
}
