import apiResponse from '../../../helpers/response.js';
import authenticate from '../../../middleware/auth.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { throwError } from '../../../helpers/errors.js';

const validators = [
  authenticate
];

async function handler(req, res, next) {
  const user = req.userModel;
  
  // Get complete user profile using the reusable method
  const profile = await user.getProfile();

  if (!profile) {
    throwError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'users.profileNotFound');
  }

  return apiResponse(res, req, next)(profile);
}

const profileRoute = {
  validators,
  default: handler
};

export default profileRoute;
export { validators };
