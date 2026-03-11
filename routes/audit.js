import { Router } from 'express';
import { registerRoute } from '../helpers/controller-wrapper.js';
import myActivityRoute from '../app/audit/myActivity/route.js';
import activityListRoute from '../app/audit/activity/list/route.js';

const router = Router();

registerRoute(router, '/my-activity', myActivityRoute, 'post');
registerRoute(router, '/activity/list', activityListRoute, 'post');

export default router;
