require('module-alias/register');
const tracer = require('dd-trace').init();
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
    region: 'sg'
  }
});

Pyroscope.start();

console.log(`Pyroscope sending profiling data to ${serverAddress}`);

// Initialize APM
console.log(`DD-Trace is configured to send data to ${tracer._tracer._url}`);
tracer.use('http', {
  clientErrorHook: (error) => {
      console.error('Error occurred in dd-trace http client:', error);
  }
});

// Make sure we are running node 7.6+
const [major, minor] = process.versions.node.split('.').map(parseFloat);
if (major < 20) {
  console.log('Please upgrade your node.js version at least 20 or greater. 👌\n ');
  process.exit();
}

// import environmental variables from our variables.env file
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

mongoose.connect(process.env.DATABASE);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

mongoose.connection.on('error', (error) => {
  console.log(
    `1. 🔥 Common Error caused issue → : check your .env file first and add your mongodb url`
  );
  console.error(`2. 🚫 Error → : ${error.message}`);
});

const modelsFiles = globSync('./src/models/**/*.js');

for (const filePath of modelsFiles) {
  require(path.resolve(filePath));
}

// Start our app!
const app = require('./app');
app.set('port', process.env.PORT || 8888);
const server = app.listen(app.get('port'), () => {
  console.log(`Express running → On PORT : ${server.address().port}`);
});
