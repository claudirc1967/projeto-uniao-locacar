/** PM2 — carrega backend/.env via Node (--env-file; PM2 env_file não injeta no processo). */
const path = require("node:path");

module.exports = {
  apps: [
    {
      name: "uniao-api",
      script: "dist/index.js",
      cwd: __dirname,
      node_args: `--env-file=${path.join(__dirname, ".env")}`,
    },
  ],
};
