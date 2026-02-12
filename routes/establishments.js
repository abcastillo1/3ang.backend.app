import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listRoute from '../app/establishment/list/route.js';
import createRoute from '../app/establishment/create/route.js';
import updateRoute from '../app/establishment/update/route.js';
import viewRoute from '../app/establishment/view/route.js';

const router = Router();

registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');
registerRoute(router, '/view', viewRoute, 'post');
registerRoute(router, '/list', listRoute, 'post');

export default router;
