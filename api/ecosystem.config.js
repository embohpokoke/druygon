module.exports = {
  apps: [{
    name: 'druygon-ai',
    script: 'server.js',
    cwd: '/root/druygon.my.id/api',
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Jakarta'
    },
    env_file: '/root/druygon.my.id/api/.env'
  }]
}
