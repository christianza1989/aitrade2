module.exports = {
  apps: [{
    name: 'lucid-hive',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/user/webapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=4096'
    },
    error_file: '/home/user/webapp/logs/err.log',
    out_file: '/home/user/webapp/logs/out.log',
    log_file: '/home/user/webapp/logs/combined.log',
    time: true
  }]
}