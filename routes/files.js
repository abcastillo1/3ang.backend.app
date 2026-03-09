import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import uploadUrlRoute from '../app/files/upload-url/route.js';
import confirmRoute from '../app/files/confirm/route.js';
import linkRoute from '../app/files/link/route.js';
import downloadUrlRoute from '../app/files/download-url/route.js';
import listRoute from '../app/files/list/route.js';
import deleteRoute from '../app/files/delete/route.js';

const router = Router();

registerRoute(router, '/upload-url', uploadUrlRoute, 'post');
registerRoute(router, '/confirm', confirmRoute, 'post');
registerRoute(router, '/link', linkRoute, 'post');
registerRoute(router, '/download-url', downloadUrlRoute, 'post');
registerRoute(router, '/list', listRoute, 'post');
registerRoute(router, '/delete', deleteRoute, 'post');

export default router;
