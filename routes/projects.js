import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import createRoute from '../app/projects/create/route.js';
import listRoute from '../app/projects/list/route.js';
import viewRoute from '../app/projects/view/route.js';
import updateRoute from '../app/projects/update/route.js';
import deleteRoute from '../app/projects/delete/route.js';
import assignmentsAddRoute from '../app/projects/assignments/add/route.js';
import assignmentsRemoveRoute from '../app/projects/assignments/remove/route.js';
import assignmentsListRoute from '../app/projects/assignments/list/route.js';

const router = Router();

registerRoute(router, '/create', createRoute, 'post');
registerRoute(router, '/list', listRoute, 'post');
registerRoute(router, '/view', viewRoute, 'post');
registerRoute(router, '/update', updateRoute, 'post');
registerRoute(router, '/delete', deleteRoute, 'post');
registerRoute(router, '/assignments/add', assignmentsAddRoute, 'post');
registerRoute(router, '/assignments/remove', assignmentsRemoveRoute, 'post');
registerRoute(router, '/assignments/list', assignmentsListRoute, 'post');

export default router;
