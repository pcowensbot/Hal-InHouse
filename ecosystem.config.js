module.exports = {
  apps: [{
    name: 'hal',
    script: './src/index.js',
    cwd: '/home/fphillips/hal/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/fphillips/hal/logs/error.log',
    out_file: '/home/fphillips/hal/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
