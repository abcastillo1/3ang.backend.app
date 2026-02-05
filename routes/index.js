import { Router } from 'express';
import authRoutes from './auth.js';
import usersRoutes from './users.js';
import rolesRoutes from './roles.js';
import permissionsRoutes from './permissions.js';
import systemRoutes from './system.js';
import auditRoutes from './audit.js';
import inventoryRoutes from './inventory.js';
import establishmentRoutes from './establishments.js';
import companyRoutes from './organizations.js';
import filesRoutes from './files.js';

const mainRouter = Router();

mainRouter.use('/auth', authRoutes);
mainRouter.use('/users', usersRoutes);
mainRouter.use('/roles', rolesRoutes);
mainRouter.use('/permissions', permissionsRoutes);
mainRouter.use('/system', systemRoutes);
mainRouter.use('/audit', auditRoutes);
mainRouter.use('/establishments', establishmentRoutes);
mainRouter.use('/organizations', companyRoutes);
mainRouter.use('/inventory', inventoryRoutes);
mainRouter.use('/files', filesRoutes);

export default mainRouter;
