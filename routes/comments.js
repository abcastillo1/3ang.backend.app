import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import listRoute from '../app/comments/list/route.js';

const router = Router();

registerRoute(router, '/list', listRoute, 'post');

export default router;

