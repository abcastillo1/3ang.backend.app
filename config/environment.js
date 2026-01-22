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
