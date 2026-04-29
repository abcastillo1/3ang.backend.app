import { validateField } from "../../../helpers/validator.js";
import apiResponse from "../../../helpers/response.js";
import validateRequest from "../../../middleware/validation.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../../config/environment.js";
import { HTTP_STATUS, ERROR_CODES } from "../../../config/constants.js";
import { throwError } from "../../../helpers/errors.js";
import { logger } from "../../../helpers/logger.js";
import { lookupTenantByEmail } from "../../../helpers/admin-api-client.js";
import { cacheOrgShard, getModelsForOrg } from "../../../helpers/shard-pool.js";

const validators = [
  validateField("data.email")
    .isEmail()
    .withMessage("validators.email.invalid")
    .notEmpty()
    .withMessage("validators.email.required"),
  validateField("data.password")
    .notEmpty()
    .withMessage("validators.password.required")
    .isLength({ min: 6 })
    .withMessage("validators.password.minLength"),
  validateRequest,
];

async function handler(req, res, next) {
  const { data } = req.body;
  console.log("Login attempt for email:", data.email);
  // Verify email is registered as a known tenant in the control plane
  const tenant = await lookupTenantByEmail(data.email);
  console.log("Login attempt for email:tenant", tenant);
  if (!tenant) {
    throwError(HTTP_STATUS.UNAUTHORIZED, "auth.invalidCredentials");
  }

  // Cache org→shard mapping server-side — never goes into JWT
  if (tenant.shard?.shardDbName) {
    cacheOrgShard(tenant.tenant.organizationId, tenant.shard.shardDbName);
  }

  // Resolve shard models from pool — same O(1) path as all other requests
  const shard = await getModelsForOrg(tenant.tenant.organizationId);
  const { User, UserSession, AuditLog } = shard.models;

  const user = await User.findByEmail(data.email);

  if (!user) {
    throwError(HTTP_STATUS.UNAUTHORIZED, "auth.invalidCredentials");
  }

  if (!user.isActive) {
    throwError(HTTP_STATUS.FORBIDDEN, "auth.userInactive");
  }

  const isValidPassword = await user.verifyPassword(data.password);

  if (!isValidPassword) {
    throwError(HTTP_STATUS.UNAUTHORIZED, "auth.invalidCredentials");
  }

  const profile = await user.getProfile();

  if (!profile) {
    throwError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "auth.userNotFound");
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    organizationId: user.organizationId,
    roleId: user.roleId,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const expiresAt = new Date();
  const expiresInHours = JWT_EXPIRES_IN.includes("h")
    ? parseInt(JWT_EXPIRES_IN.replace("h", ""))
    : 24;
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  await UserSession.create({
    userId: user.id,
    token,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    expiresAt,
  });

  await user.update({ lastLoginAt: new Date() });

  await AuditLog.createLog({
    organizationId: user.organizationId,
    userId: user.id,
    action: "login",
    entity: "auth",
    entityId: user.id,
    metadata: {
      method: "POST",
      path: req.path,
      ip: req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress,
      userAgent: req.get("user-agent"),
      success: true,
    },
  }).catch((err) => {
    logger.error("Error creating audit log for login", {
      error: err.message,
      userId: user.id,
    });
  });

  const response = {
    token,
    ...profile,
  };

  return apiResponse(res, req, next)(response);
}

const loginRoute = {
  validators,
  default: handler,
  action: "login",
  entity: "auth",
};

export default loginRoute;
export { validators };
