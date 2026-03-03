import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import uploadRoute from '../app/files/upload/route.js';
import uploadUrlRoute from '../app/files/upload-url/route.js';
import confirmRoute from '../app/files/confirm/route.js';

const router = Router();

registerRoute(router, '/upload', uploadRoute, 'post');
registerRoute(router, '/upload-url', uploadUrlRoute, 'post');
registerRoute(router, '/confirm', confirmRoute, 'post');

export default router;
