import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listRoute from '../app/comments/list/route.js';
import createRoute from '../app/comments/create/route.js';
import updateRoute from '../app/comments/update/route.js';
import deleteRoute from '../app/comments/delete/route.js';

const router = Router();

registerRoute(router, '/list', listRoute, 'post');
registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');
registerRoute(router, '/delete', deleteRoute, 'post');

export default router;

