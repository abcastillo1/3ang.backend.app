import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import healthRoute from '../app/system/health/route.js';

const router = Router();

registerRoute(router, '/health', healthRoute, 'post');

export default router;
