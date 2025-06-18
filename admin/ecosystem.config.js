module.exports = {
  apps: [
    {
      name: "admin-server",
      script: "server/index.js",
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
