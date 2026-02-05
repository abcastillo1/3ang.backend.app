import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import uploadRoute from '../app/files/upload/route.js';

const router = Router();

registerRoute(router, '/upload', uploadRoute, 'post');

export default router;
