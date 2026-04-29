import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/environment.js';
import { HTTP_STATUS } from '../config/constants.js';
import { throwError } from '../helpers/errors.js';
import modelsInstance from '../models/index.js';
import { getModelsForOrg } from '../helpers/shard-pool.js';

export default async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.tokenRequired');
  }

  const token = authHeader.substring(7);

  // Decode to get organizationId before full verify — needed for shard pool lookup
  const raw = jwt.decode(token);

  // Resolve shard from org cache (O(1) Map lookup, zero DB query)
  // On cache miss: resolves via admin tenant-lookup using email from JWT
  const shard = raw?.organizationId
    ? await getModelsForOrg(raw.organizationId, raw.email)
    : modelsInstance;

  req.models = shard.models;
  req.db = shard.sequelize;

  const { UserSession, User, Organization } = shard.models;

  let userModel = null;

  const session = await UserSession.findActiveByToken(token);

  if (session) {
    userModel = session.user;
    req.session = session;

    if (!userModel.lastLoginAt) {
      await userModel.update({ lastLoginAt: new Date() });
    }
  } else {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userModel = await User.findByPk(decoded.id, {
        include: [{
          model: Organization,
          as: 'organization'
        }]
      });

      if (!userModel || !userModel.isActive) {
        throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.invalidOrInactiveUser');
      }
    } catch (err) {
      throwError(HTTP_STATUS.UNAUTHORIZED, 'auth.invalidOrExpiredToken');
    }
  }

  if (!userModel.organization) {
    userModel = await User.findByPk(userModel.id, {
      include: [{
        model: Organization,
        as: 'organization'
      }]
    });
  }

  req.user = {
    id: userModel.id,
    email: userModel.email,
    organizationId: userModel.organizationId,
    roleId: userModel.roleId,
  };

  req.userModel = userModel;
  req.organization = userModel.organization;
  next();
}
