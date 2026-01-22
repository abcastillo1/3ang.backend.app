import apiResponse from '../../../helpers/response.js';

const validators = [];

async function handler(req, res, next) {
  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  return apiResponse(res, req, next)(response);
}

const healthRoute = {
  validators,
  default: handler,
  skipAudit: true
};

export default healthRoute;
export { validators };
