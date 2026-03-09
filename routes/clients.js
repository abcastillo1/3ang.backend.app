import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import createRoute from '../app/clients/create/route.js';
import listRoute from '../app/clients/list/route.js';
import viewRoute from '../app/clients/view/route.js';
import updateRoute from '../app/clients/update/route.js';
import deleteRoute from '../app/clients/delete/route.js';

const router = Router();

registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/list', listRoute, 'post');
registerRoute(router, '/view', viewRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');
registerRoute(router, '/delete', deleteRoute, 'post');

export default router;
