import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import mainRouter from './routes/index.js';
import bodyValidator from './middleware/body-validator.js';
import i18nMiddleware from './middleware/i18n.js';
import { logger } from './helpers/logger.js';
import { HTTP_STATUS, ERROR_CODES } from './config/constants.js';

class Server {
  constructor() {
    this.app = express();
    this.serverInstance = null;
  }

  initializeApp() {
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(i18nMiddleware);
    this.app.use(bodyValidator);
    this.app.use('/api/v1', mainRouter);

    this.app.get('/health', (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });

    this.app.use((req, res) => {
      const message = req.translate ? req.translate('route.notFound') : 'Route not found';
      res.status(HTTP_STATUS.NOT_FOUND).json({
        statusCode: HTTP_STATUS.NOT_FOUND,
        message,
        errorCode: 'route.notFound'
      });
    });

    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      });

      const statusCode = err.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
      const errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;
      const message = req.translate ? req.translate(errorCode) : 'Internal server error';

      res.status(statusCode).json({
        statusCode,
        message,
        errorCode
      });
    });

    return this.app;
  }

  async start() {
    const { PORT } = await import('./config/environment.js');

    this.initializeApp();

    this.serverInstance = this.app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`);
      console.log(`Server started on http://localhost:${PORT}`);
    });

    this.serverInstance.timeout = 30000;

    return this.serverInstance;
  }

  async stop() {
    if (this.serverInstance) {
      return new Promise((resolve) => {
        this.serverInstance.close(() => {
          logger.info('Server stopped');
          resolve();
        });
      });
    }
  }
}

export default Server;
