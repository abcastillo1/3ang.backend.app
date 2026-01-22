import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import loginRoute from '../app/auth/login/route.js';

const router = Router();

registerRoute(router, '/login', loginRoute, 'post');

export default router;
