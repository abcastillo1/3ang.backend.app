import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import productCreateRoute from '../app/inventory/products/create/route.js';
import productListRoute from '../app/inventory/products/list/route.js';
import productViewRoute from '../app/inventory/products/view/route.js';
import productUpdateRoute from '../app/inventory/products/update/route.js';
import categoryCreateRoute from '../app/inventory/categories/create/route.js';
import categoryListRoute from '../app/inventory/categories/list/route.js';
import categoryUpdateRoute from '../app/inventory/categories/update/route.js';
import categoryDeleteRoute from '../app/inventory/categories/delete/route.js';
import movementCreateRoute from '../app/inventory/movements/create/route.js';
import movementUpdateRoute from '../app/inventory/movements/update/route.js';
import movementListRoute from '../app/inventory/movements/list/route.js';
import movementViewRoute from '../app/inventory/movements/view/route.js';
import stockListRoute from '../app/inventory/stock/list/route.js';

const router = Router();

registerRoute(router, '/products/create', productCreateRoute, 'post');
registerRoute(router, '/products/list', productListRoute, 'post');
registerRoute(router, '/products/view', productViewRoute, 'post');
registerRoute(router, '/products/update', productUpdateRoute, 'post');
registerRoute(router, '/categories/create', categoryCreateRoute, 'post');
registerRoute(router, '/categories/list', categoryListRoute, 'post');
registerRoute(router, '/categories/update', categoryUpdateRoute, 'post');
registerRoute(router, '/categories/delete', categoryDeleteRoute, 'post');
registerRoute(router, '/movements/create', movementCreateRoute, 'post');
registerRoute(router, '/movements/list', movementListRoute, 'post');
registerRoute(router, '/movements/view', movementViewRoute, 'post');
registerRoute(router, '/movements/update', movementUpdateRoute, 'post');
registerRoute(router, '/stock/list', stockListRoute, 'post');

export default router;
