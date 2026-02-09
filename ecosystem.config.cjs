module.exports = {
  apps: [
    {
      name: "detailflix",
      script: "server.js",
      cwd: "/var/www/detailflix",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      time: true,
      autorestart: true,
      min_uptime: "5s",
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      max_memory_restart: "700M",
    },
  ],
};
