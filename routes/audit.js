import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import historyRoute from '../app/audit/history/route.js';
import myActivityRoute from '../app/audit/myActivity/route.js';

const router = Router();

registerRoute(router, '/history', historyRoute, 'post');
registerRoute(router, '/my-activity', myActivityRoute, 'post');

export default router;
