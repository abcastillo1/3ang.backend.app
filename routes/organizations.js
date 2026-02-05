import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
/* import listRoute from '../app/company/list/route.js'; */
import createRoute from '../app/organizations/create/route.js';
import updateRoute from '../app/organizations/update/route.js';

const router = Router();

/* registerRoute(router, '/list', listRoute, 'post'); */
registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');

export default router;
