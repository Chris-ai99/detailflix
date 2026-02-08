module.exports = {
  apps: [
    {
      name: "detailflix",
      script: "server.js",
      cwd: "/var/www/detailflix",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
