import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import loginRoute from '../app/auth/login/route.js';
import refreshRoute from '../app/auth/refresh/route.js';

const router = Router();

registerRoute(router, '/login', loginRoute, 'post');
registerRoute(router, '/refresh', refreshRoute, 'post');

export default router;
