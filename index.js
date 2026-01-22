import Server from './server.js';
import modelsInstance from './models/index.js';
import { logger } from './helpers/logger.js';

async function start() {
  try {
    await modelsInstance.initialize();

    const server = new Server();
    await server.start();

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, closing server...');
      await server.stop();
      await modelsInstance.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, closing server...');
      await server.stop();
      await modelsInstance.close();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error starting application:', error);
    console.error('Error starting application:', error.message);
    process.exit(1);
  }
}

start();
