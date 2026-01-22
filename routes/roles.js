import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listRolesRoute from '../app/roles/list/route.js';
import createRoleRoute from '../app/roles/create/route.js';
import updateRoleRoute from '../app/roles/update/route.js';
import deleteRoleRoute from '../app/roles/delete/route.js';
import assignPermissionsRoute from '../app/roles/assignPermissions/route.js';

const router = Router();

registerRoute(router, '/list', listRolesRoute, 'post');
registerRoute(router, '/create', createRoleRoute, 'post');
registerRoute(router, '/update', updateRoleRoute, 'post');
registerRoute(router, '/delete', deleteRoleRoute, 'post');
registerRoute(router, '/assign-permissions', assignPermissionsRoute, 'post');

export default router;
