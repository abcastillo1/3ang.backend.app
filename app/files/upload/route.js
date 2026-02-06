import authenticate from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/permissions.js';
import { upload, validateFileUpload } from '../../../middleware/files/multer.js';
import { storageService } from '../../../helpers/storage.js';
import { throwError } from '../../../helpers/errors.js';
import { HTTP_STATUS } from '../../../config/constants.js';
import apiResponse from '../../../helpers/response.js';
import { logger } from '../../../helpers/logger.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const validators = [
  authenticate,
  requirePermission('files.upload'),
  upload.array('files', 10),
  validateFileUpload
];

async function handler(req, res, next) {
  const { user } = req;
  


  const files = req.files || (req.file ? [req.file] : []);
  const category = req.body?.category;

  if (!files || files.length === 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'files.file.required');
  }
  
  logger.debug(`Processing ${files.length} file(s)`);

  const uploadedFiles = [];


  for (const file of files) {

    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const storagePath = `${user.organizationId}/${category}/${fileName}`;

    try {
      await storageService.uploadFile(
        file.buffer,
        fileName,
        storagePath,
        file.mimetype
      );

      uploadedFiles.push({
        path: storagePath,
        category,
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size
      });
    } catch (error) {
      logger.error('Error uploading file:', {
        fileName: file.originalname,
        error: error.message
      });
    }
  }

  if (uploadedFiles.length === 0) {
    throw throwError(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'files.upload.failed',
      { message: 'Failed to upload all files' }
    );
  }

  const response = {
    files: uploadedFiles,
    count: uploadedFiles.length
  };



  return apiResponse(res, req, next)(response);
}

const uploadRoute = {
  validators,
  default: handler,
  action: 'upload',
  entity: 'files'
};

export default uploadRoute;
export { validators };
