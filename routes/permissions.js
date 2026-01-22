import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listPermissionsRoute from '../app/permissions/list/route.js';

const router = Router();

registerRoute(router, '/list', listPermissionsRoute, 'post');

export default router;
