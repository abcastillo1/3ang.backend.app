import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listRoute from '../app/establishment/list/route.js';
import createRoute from '../app/establishment/create/route.js';
import updateRoute from '../app/establishment/update/route.js';

const router = Router();

registerRoute(router, '/list', listRoute, 'post');
registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');

export default router;
