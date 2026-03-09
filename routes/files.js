import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import uploadUrlRoute from '../app/files/upload-url/route.js';
import confirmRoute from '../app/files/confirm/route.js';
import linkRoute from '../app/files/link/route.js';

const router = Router();

registerRoute(router, '/upload-url', uploadUrlRoute, 'post');
registerRoute(router, '/confirm', confirmRoute, 'post');
registerRoute(router, '/link', linkRoute, 'post');

export default router;
