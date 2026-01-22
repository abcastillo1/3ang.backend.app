import { Router } from 'express';
import authRoutes from './auth.js';

const mainRouter = Router();

mainRouter.use('/auth', authRoutes);

export default mainRouter;
