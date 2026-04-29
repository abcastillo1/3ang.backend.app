import { Sequelize } from "sequelize";
import {
  NODE_ENV,
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_NAME,
  DATABASE_USER,
  DATABASE_PASSWORD,
  CENTRAL_DB_HOST,
  CENTRAL_DB_PORT,
  CENTRAL_DB_NAME,
  CENTRAL_DB_USER,
  CENTRAL_DB_PASSWORD,
} from "./environment.js";

/**
 * Central Database Connection (Control Plane)
 * Contains: platform_users, platform_organizations, platform_plans, shard_mapping, invoices, etc.
 */
export const sequelizeCentral = new Sequelize({
  host: CENTRAL_DB_HOST,
  port: CENTRAL_DB_PORT,
  database: CENTRAL_DB_NAME,
  username: CENTRAL_DB_USER,
  password: CENTRAL_DB_PASSWORD,
  dialect: "mysql",
  logging: NODE_ENV === "development" ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  timezone: "+00:00",
});

/**
 * Factory function to get Sequelize connection for a specific shard
 * @param {number} shardId - The shard identifier (1, 2, 3, etc.)
 * @returns {Sequelize} Sequelize instance connected to the shard database
 */
export function getShardDatabase(shardId) {
  const dbName = `${DATABASE_NAME}_shard_${shardId}`;

  return new Sequelize({
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    database: dbName,
    username: DATABASE_USER,
    password: DATABASE_PASSWORD,
    dialect: "mysql",
    logging: NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: "+00:00",
  });
}

/**
 * Cache for shard database connections (avoid recreating connections)
 */
const shardDatabaseCache = {};

/**
 * Get or create a cached Sequelize connection for a specific shard
 * @param {number} shardId - The shard identifier
 * @returns {Sequelize} Sequelize instance for the shard
 */
export function getShardDatabaseCached(shardId) {
  if (!shardDatabaseCache[shardId]) {
    shardDatabaseCache[shardId] = getShardDatabase(shardId);
  }
  return shardDatabaseCache[shardId];
}

export default {
  sequelizeCentral,
  getShardDatabase,
  getShardDatabaseCached,
};
