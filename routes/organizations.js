import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
/* import listRoute from '../app/organizations/list/route.js'; */
import createRoute from '../app/organizations/create/route.js';
import updateRoute from '../app/organizations/update/route.js';
import viewRoute from '../app/organizations/view/route.js';
import listRoute from '../app/organizations/list/list.js';

const router = Router();

registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');
registerRoute(router, '/view', viewRoute, 'post');
registerRoute(router, '/list', listRoute, 'post');

export default router;
