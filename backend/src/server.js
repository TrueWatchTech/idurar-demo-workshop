require('module-alias/register');
const tracer = require('dd-trace').init({
  logInjection: true,
  profiling: true,
  runtimeMetrics: true,
});
const { logger } = require('@/helpers');
const mongoose = require('mongoose');
const { globSync } = require('glob');
const path = require('path');

// Initialize Profiling
const Pyroscope = require('@pyroscope/nodejs');

const serverAddress = `http://${process.env.DD_TRACE_AGENT_HOSTNAME}:4040`;

Pyroscope.init({
  serverAddress: serverAddress,
  appName: 'iDURAR',
  tags: {
    region: 'sg',
  },
});

Pyroscope.start();

logger.info(`Pyroscope sending profiling data to ${serverAddress}`);

// Initialize APM
logger.info(`DD-Trace is configured to send data to ${tracer._tracer._url}`);
tracer.use('http', {
  clientErrorHook: (error) => {
    logger.error(`Error occurred in dd-trace http client: ${error}`);
  },
});

// Make sure we are running node 7.6+
const [major, minor] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  logger.error('Please upgrade your node.js version at least 20 or greater. 👌\n ');
  process.exit();
}

// import environmental variables from our variables.env file
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

// Configure mongoose with proper connection options to prevent memory leaks
mongoose.connect(process.env.DATABASE, {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 2, // Maintain at least 2 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  // bufferMaxEntries: 0, // Disable mongoose buffering
  bufferCommands: false, // Disable mongoose buffering
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

mongoose.connection.on('error', (error) => {
  logger.info(
    `1. 🔥 Common Error caused issue → : check your .env file first and add your mongodb url`
  );
  logger.error(`2. 🚫 Error → : ${error.message}`);
});

const modelsFiles = globSync('./src/models/**/*.js');

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

// Start our app!
const app = require('./app');
app.set('port', process.env.PORT || 8888);
const server = app.listen(app.get('port'), () => {
  logger.info(`Express running → On PORT : ${server.address().port}`);
});

// Graceful shutdown handler to prevent memory leaks
let isShuttingDown = false;

const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Stop Pyroscope profiling
      if (Pyroscope && typeof Pyroscope.stop === 'function') {
        Pyroscope.stop();
        logger.info('Pyroscope stopped');
      }

      // Close mongoose connection
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');

      // Shutdown dd-trace
      if (tracer && typeof tracer.destroy === 'function') {
        await tracer.destroy();
        logger.info('DD-Trace destroyed');
      }

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  gracefulShutdown('unhandledRejection');
});
