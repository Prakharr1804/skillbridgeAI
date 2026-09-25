require('dotenv').config()
const app = require('./src/app')
const connectToDB = require('./src/config/database')

const PORT = process.env.PORT || 3000;
connectToDB()
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Graceful Shutdown on termination signals
    const gracefulShutdown = (signal) => {
      console.log(`${signal} received. Closing HTTP server and database connections...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });