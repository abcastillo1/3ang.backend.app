import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import speciesCreateRoute from '../app/species/create/route.js';
import speciesUpdateRoute from '../app/species/update/route.js';
import speciesViewRoute from '../app/species/view/route.js';
import speciesListRoute from '../app/species/list/route.js';
import speciesDeleteRoute from '../app/species/delete/route.js';
import animalsCreateRoute from '../app/animals/create/route.js';
import animalsUpdateRoute from '../app/animals/update/route.js';
import animalsViewRoute from '../app/animals/view/route.js';
import animalsListRoute from '../app/animals/list/route.js';
import animalsDeleteRoute from '../app/animals/delete/route.js';

const router = Router();

registerRoute(router, '/species/create', speciesCreateRoute, 'post');
registerRoute(router, '/species/update', speciesUpdateRoute, 'post');
registerRoute(router, '/species/view', speciesViewRoute, 'post');
registerRoute(router, '/species/list', speciesListRoute, 'post');
registerRoute(router, '/species/delete', speciesDeleteRoute, 'post');
registerRoute(router, '/animals/create', animalsCreateRoute, 'post');
registerRoute(router, '/animals/update', animalsUpdateRoute, 'post');
registerRoute(router, '/animals/view', animalsViewRoute, 'post');
registerRoute(router, '/animals/list', animalsListRoute, 'post');
registerRoute(router, '/animals/delete', animalsDeleteRoute, 'post');

export default router;
