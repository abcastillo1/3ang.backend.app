import modelsInstance from '../models/index.js';

export function auditLog(action, entity = null) {
  return async function (req, res, next) {
    const originalJson = res.json.bind(res);
    
    res.json = function (data) {
      const { AuditLog } = modelsInstance.models;
      
      if (req.user && req.user.id && res.statusCode < 400) {
        const organizationId = req.user.organizationId || req.user.organization_id;
        
        AuditLog.createLog({
          organizationId,
          userId: req.user.id,
          action,
          entity: entity || req.route?.path?.split('/')[1] || 'unknown',
          entityId: req.params?.id || data?.data?.id || null,
          metadata: {
            method: req.method,
            path: req.path,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            body: req.method !== 'GET' ? req.body : null,
            query: Object.keys(req.query).length > 0 ? req.query : null
          }
        }).catch(err => {
          console.error('Error creating audit log:', err);
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
}
