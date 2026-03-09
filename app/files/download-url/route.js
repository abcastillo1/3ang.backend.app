import { validateField } from '../../../helpers/validator.js';
import validateRequest from '../../../middleware/validation.js';
import authenticate from '../../../middleware/auth.js';
import apiResponse from '../../../helpers/response.js';
import { storageService } from '../../../helpers/storage.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import { STORAGE_SIGNED_URL_EXPIRY } from '../../../config/environment.js';

export const validators = [
  validateField('data.key')
    .notEmpty()
    .withMessage('validators.key.required')
    .isLength({ max: 512 })
    .withMessage('validators.key.invalid'),
  validateRequest,
  authenticate
];

async function handler(req, res, next) {
  const { data } = req.body;
  const { user } = req;

  const key = data.key.trim();
  const expectedPrefix = `${user.organizationId}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw throwError(HTTP_STATUS.FORBIDDEN, 'files.downloadUrl.forbidden');
  }

  const downloadUrl = await storageService.generateDownloadUrl(key);

  return apiResponse(res, req, next)({
    downloadUrl,
    expiresIn: STORAGE_SIGNED_URL_EXPIRY || 3600
  });
}

const downloadUrlRoute = {
  validators,
  default: handler,
  action: 'download-url',
  entity: 'files'
};

export default downloadUrlRoute;
