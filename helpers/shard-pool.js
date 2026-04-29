import Models from '../models/index.js';
import {
  DATABASE_HOST,
  DATABASE_PORT,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_NAME,
} from '../config/environment.js';
import { logger } from './logger.js';
import { lookupTenantByEmail } from './admin-api-client.js';

// shardDbName → Models instance
const connectionPool = new Map();

// organizationId → shardDbName (resolved at login, cached permanently)
const orgShardCache = new Map();

async function getOrCreateConnection(shardDbName) {
  if (connectionPool.has(shardDbName)) return connectionPool.get(shardDbName);

  logger.info('Initializing shard connection', { shardDbName });

  const instance = new Models();
  await instance.initialize({
    host: DATABASE_HOST,
    port: DATABASE_PORT,
    database: shardDbName,
    username: DATABASE_USER,
    password: DATABASE_PASSWORD,
  });

  connectionPool.set(shardDbName, instance);
  return instance;
}

// Called at startup to register the already-initialized default instance
export function registerShard(shardDbName, modelsInstance) {
  connectionPool.set(shardDbName, modelsInstance);
}

// Called at login: persist org→shard mapping so subsequent requests need no lookup
export function cacheOrgShard(organizationId, shardDbName) {
  orgShardCache.set(organizationId, shardDbName);
}

// Called per request from auth middleware
// Normal case: O(1) Map lookups, zero network
// Cache miss (after restart): one admin API call by email, then cached permanently
export async function getModelsForOrg(organizationId, email) {
  let shardDbName = orgShardCache.get(organizationId);

  if (!shardDbName && email) {
    const tenant = await lookupTenantByEmail(email);
    if (tenant?.shard?.shardDbName) {
      shardDbName = tenant.shard.shardDbName;
      orgShardCache.set(organizationId, shardDbName);
    }
  }

  return getOrCreateConnection(shardDbName || DATABASE_NAME);
}
