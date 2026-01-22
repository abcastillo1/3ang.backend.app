import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listUsersRoute from '../app/users/list/route.js';
import profileRoute from '../app/users/profile/route.js';
import updateRoute from '../app/users/update/route.js';
import organizationRoute from '../app/users/organization/route.js';

const router = Router();

registerRoute(router, '/list', listUsersRoute, 'post');
registerRoute(router, '/profile', profileRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');
registerRoute(router, '/organization', organizationRoute, 'post');

export default router;
