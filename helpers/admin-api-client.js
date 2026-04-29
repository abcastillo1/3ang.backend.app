import crypto from 'crypto';
import { ADMIN_API_URL, ADMIN_SERVICE_TOKEN } from '../config/environment.js';
import { logger } from './logger.js';

function verifyResponseSignature(signature, payload) {
  if (!signature) return false;
  const expected = crypto
    .createHmac('sha256', ADMIN_SERVICE_TOKEN)
    .update(JSON.stringify(payload))
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function adminPost(path, body) {
  const url = `${ADMIN_API_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Service-Token': ADMIN_SERVICE_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: body }),
  });

  const responseSignature = res.headers.get('x-response-signature');
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(payload.message || `Admin API error ${res.status}`);
    err.status = res.status;
    err.code = payload.code || 'adminApi.error';
    throw err;
  }

  // Verify HMAC signature when present (tenant-lookup signs its response)
  if (responseSignature && payload.data !== undefined) {
    if (!verifyResponseSignature(responseSignature, payload.data)) {
      const err = new Error('Admin API response signature mismatch');
      err.status = 502;
      err.code = 'adminApi.signatureInvalid';
      throw err;
    }
  }

  return payload;
}

export async function lookupTenantByEmail(email) {
  try {
    const result = await adminPost('/platform/auth/tenant-lookup', { email });
    return result.data;
  } catch (err) {
    if (err.status === 404) return null;
    logger.error('Admin API tenant lookup failed', { email, error: err.message });
    throw err;
  }
}

export async function registerEmailRouting(email, organizationId) {
  try {
    await adminPost('/platform/auth/email-routing', { email, organizationId });
  } catch (err) {
    logger.error('Admin API email routing registration failed', { email, organizationId, error: err.message });
    throw err;
  }
}

export async function resolveOrgShard(organizationId) {
  try {
    const result = await adminPost('/platform/organizations/shard-lookup', { organizationId });
    return result.data?.shardDbName || null;
  } catch (err) {
    if (err.status === 404) return null;
    logger.error('Admin API shard lookup failed', { organizationId, error: err.message });
    throw err;
  }
}
