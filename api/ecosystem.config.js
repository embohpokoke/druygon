const dotenv = require('dotenv');
const path = require('path');
const envVars = dotenv.config({ path: path.join(__dirname, '.env') }).parsed || {};

module.exports = {
  apps: [{
    name: 'druygon-ai',
    script: 'server.js',
    cwd: '/root/druygon.my.id/api',
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Jakarta',
      ...envVars
    }
  }]
};
