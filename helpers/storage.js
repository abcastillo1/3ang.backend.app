import { logger } from './logger.js';
import {
  STORAGE_PROVIDER,
  STORAGE_BUCKET_PRIVATE,
  STORAGE_SIGNED_URL_EXPIRY,
  B2_APPLICATION_KEY_ID,
  B2_APPLICATION_KEY,
  B2_BUCKET_ID,
  B2_BUCKET_NAME,
  AWS_S3_REGION,
  AWS_S3_BUCKET_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY
} from '../config/environment.js';

class StorageService {
  constructor() {
    this.provider = STORAGE_PROVIDER || 'backblaze';
    this.bucketPrivate = STORAGE_BUCKET_PRIVATE || false;
    this.signedUrlExpiry = STORAGE_SIGNED_URL_EXPIRY || 3600;
    this.b2Client = null;
    this.s3Client = null;
    this.B2 = null;
    this.initialized = false;
    this.b2AuthData = null;
  }

  async initialize() {
    if (this.initialized) return;
    
    if (this.provider === 'backblaze') {
      if (!B2_APPLICATION_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_ID || !B2_BUCKET_NAME) {
        logger.warn('Backblaze B2 configuration incomplete. File uploads will fail.');
        this.initialized = true;
        return;
      }
      try {
        const B2Module = await import('backblaze-b2');
        this.B2 = B2Module.default;
        this.b2Client = new this.B2({
          applicationKeyId: B2_APPLICATION_KEY_ID,
          applicationKey: B2_APPLICATION_KEY
        });
        // Authorize and store auth data for signed URLs
        if (this.bucketPrivate) {
          const authResponse = await this.b2Client.authorize();
          this.b2AuthData = authResponse.data;
        }
        this.initialized = true;
      } catch (error) {
        logger.error('Failed to initialize Backblaze B2 client:', error);
        this.initialized = true;
      }
    } else if (this.provider === 's3') {
      // TODO: Initialize AWS S3 client when migrating
      // import { S3Client } from '@aws-sdk/client-s3';
      // this.s3Client = new S3Client({
      //   region: AWS_S3_REGION,
      //   credentials: {
      //     accessKeyId: AWS_ACCESS_KEY_ID,
      //     secretAccessKey: AWS_SECRET_ACCESS_KEY
      //   }
      // });
      this.initialized = true;
    }
  }

  async uploadFile(fileBuffer, fileName, path, mimeType) {
    await this.initialize();
    
    try {
      if (this.provider === 'backblaze') {
        return await this.uploadToBackblaze(fileBuffer, fileName, path, mimeType);
      } else if (this.provider === 's3') {
        return await this.uploadToS3(fileBuffer, fileName, path, mimeType);
      }
      throw new Error(`Unsupported storage provider: ${this.provider}`);
    } catch (error) {
      logger.error('Error uploading file to storage:', {
        error: error.message,
        provider: this.provider,
        path
      });
      throw error;
    }
  }

  async uploadToBackblaze(fileBuffer, fileName, path, mimeType) {
    try {
      // Authorize B2 account (if not already authorized for private buckets)
      if (!this.b2AuthData) {
        const authResponse = await this.b2Client.authorize();
        this.b2AuthData = authResponse.data;
      }
      const { downloadUrl } = this.b2AuthData;

      // Get upload URL
      const uploadUrlResponse = await this.b2Client.getUploadUrl({
        bucketId: B2_BUCKET_ID
      });
      const { uploadUrl, authorizationToken: uploadAuthToken } = uploadUrlResponse.data;

      // Upload file
      const uploadResponse = await this.b2Client.uploadFile({
        uploadUrl,
        uploadAuthToken,
        fileName: path,
        data: fileBuffer,
        mime: mimeType
      });

      const fileId = uploadResponse.data.fileId;
      
      // Generate URL (signed if bucket is private, public otherwise)
      let url;
      if (this.bucketPrivate) {
        url = await this.generateSignedUrl(path, fileId);
      } else {
        url = `${downloadUrl}/file/${B2_BUCKET_NAME}/${path}`;
      }

      return {
        fileId,
        url,
        path
      };
    } catch (error) {
      logger.error('Backblaze upload error:', error);
      throw new Error(`Failed to upload file to Backblaze: ${error.message}`);
    }
  }

  async generateSignedUrl(filePath, fileId) {
    try {
      if (!this.b2AuthData) {
        const authResponse = await this.b2Client.authorize();
        this.b2AuthData = authResponse.data;
      }

      const { downloadUrl } = this.b2AuthData;
      
      // Generate download authorization for private file
      // fileNamePrefix must match exactly or be a prefix
      const downloadAuthResponse = await this.b2Client.getDownloadAuthorization({
        bucketId: B2_BUCKET_ID,
        fileNamePrefix: filePath,
        validDurationInSeconds: this.signedUrlExpiry
      });

      const { authorizationToken: downloadAuthToken } = downloadAuthResponse.data;
      
      // Construct signed URL
      // Format: https://{downloadUrl}/file/{bucketName}/{fileName}?Authorization={token}
      const encodedPath = encodeURIComponent(filePath);
      const signedUrl = `${downloadUrl}/file/${B2_BUCKET_NAME}/${encodedPath}?Authorization=${downloadAuthToken}`;
      
      return signedUrl;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      // Fallback: use authorization token from initial auth (valid for 24h)
      const { downloadUrl, authorizationToken } = this.b2AuthData || {};
      if (downloadUrl && authorizationToken) {
        const encodedPath = encodeURIComponent(filePath);
        return `${downloadUrl}/file/${B2_BUCKET_NAME}/${encodedPath}?Authorization=${authorizationToken}`;
      }
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  async uploadToS3(fileBuffer, fileName, path, mimeType) {
    // TODO: Implement S3 upload when migrating
    // const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    // const command = new PutObjectCommand({
    //   Bucket: AWS_S3_BUCKET_NAME,
    //   Key: path,
    //   Body: fileBuffer,
    //   ContentType: mimeType
    // });
    // await this.s3Client.send(command);
    // const url = `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${path}`;
    // return { url, path };
    throw new Error('S3 upload not yet implemented');
  }

  async deleteFile(path) {
    await this.initialize();
    
    try {
      if (this.provider === 'backblaze') {
        return await this.deleteFromBackblaze(path);
      } else if (this.provider === 's3') {
        return await this.deleteFromS3(path);
      }
      throw new Error(`Unsupported storage provider: ${this.provider}`);
    } catch (error) {
      logger.error('Error deleting file from storage:', {
        error: error.message,
        provider: this.provider,
        path
      });
      throw error;
    }
  }

  async deleteFromBackblaze(path) {
    try {
      await this.b2Client.authorize();
      
      // Get file info to get fileId
      const listFilesResponse = await this.b2Client.listFileNames({
        bucketId: B2_BUCKET_ID,
        startFileName: path,
        maxFileCount: 1
      });

      if (listFilesResponse.data.files.length === 0) {
        logger.warn(`File not found in Backblaze: ${path}`);
        return;
      }

      const file = listFilesResponse.data.files[0];
      if (file.fileName !== path) {
        logger.warn(`File path mismatch: expected ${path}, got ${file.fileName}`);
        return;
      }

      await this.b2Client.deleteFileVersion({
        fileId: file.fileId,
        fileName: path
      });

      logger.info(`File deleted from Backblaze: ${path}`);
    } catch (error) {
      logger.error('Backblaze delete error:', error);
      throw new Error(`Failed to delete file from Backblaze: ${error.message}`);
    }
  }

  async deleteFromS3(path) {
    // TODO: Implement S3 delete when migrating
    // const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    // const command = new DeleteObjectCommand({
    //   Bucket: AWS_S3_BUCKET_NAME,
    //   Key: path
    // });
    // await this.s3Client.send(command);
    throw new Error('S3 delete not yet implemented');
  }

  async getFileUrl(path, fileId = null) {
    await this.initialize();
    
    if (this.provider === 'backblaze') {
      if (this.bucketPrivate) {
        return await this.generateSignedUrl(path, fileId);
      } else {
        if (!this.b2AuthData) {
          const authResponse = await this.b2Client.authorize();
          this.b2AuthData = authResponse.data;
        }
        const { downloadUrl } = this.b2AuthData;
        return `${downloadUrl}/file/${B2_BUCKET_NAME}/${path}`;
      }
    } else if (this.provider === 's3') {
      // TODO: Generate signed S3 URL when migrating
      // if (this.bucketPrivate) {
      //   const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      //   const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      //   const command = new GetObjectCommand({
      //     Bucket: AWS_S3_BUCKET_NAME,
      //     Key: path
      //   });
      //   return await getSignedUrl(this.s3Client, command, { expiresIn: this.signedUrlExpiry });
      // }
      return `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${path}`;
    }
    return null;
  }
}

export const storageService = new StorageService();
