import dotenv from 'dotenv';

dotenv.config();

const requiredVars = [
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'JWT_SECRET',
  'PORT'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = parseInt(process.env.PORT) || 3000;
export const DATABASE_HOST = process.env.DATABASE_HOST;
export const DATABASE_NAME = process.env.DATABASE_NAME;
export const DATABASE_USER = process.env.DATABASE_USER;
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;
export const DATABASE_PORT = parseInt(process.env.DATABASE_PORT) || 3306;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'backblaze';
export const STORAGE_BUCKET_PRIVATE = process.env.STORAGE_BUCKET_PRIVATE === 'true';
export const STORAGE_SIGNED_URL_EXPIRY = parseInt(process.env.STORAGE_SIGNED_URL_EXPIRY) || 3600;

export const B2_APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
export const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
export const B2_BUCKET_ID = process.env.B2_BUCKET_ID;
export const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME;

export const AWS_S3_REGION = process.env.AWS_S3_REGION;
export const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
