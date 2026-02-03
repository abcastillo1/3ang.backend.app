import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import productCreateRoute from '../app/inventory/products/create/route.js';
import productListRoute from '../app/inventory/products/list/route.js';
import stockUpdateRoute from '../app/inventory/stock/update/route.js';

const router = Router();

registerRoute(router, '/products/create', productCreateRoute, 'post');
registerRoute(router, '/products/list', productListRoute, 'post');
registerRoute(router, '/stock/update', stockUpdateRoute, 'post');

export default router;
