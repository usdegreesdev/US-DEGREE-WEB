// PM2 config for the standalone Next.js build. Shipped inside every release and
// started from the `current` symlink, so a release switch is just a symlink flip
// plus a restart.
//
// Runtime secrets (API_URL, PROXY_IP_SECRET, TRUSTED_PROXY_HOPS, ...) live in the
// shared env file on the VPS — never in the repo or the build artifact. The
// standalone server.js does not load .env files itself, so Node loads it via
// --env-file.
const fs = require("fs");

const BASE = "/var/www/usdegrees/web-releases";
const ENV_FILE = `${BASE}/shared/.env.production`;

// Keep listening on whatever port Nginx already proxies to: PORT from the env
// file if set (as with `npm start` before), otherwise Next's default 3000.
function readPort() {
  try {
    const m = /^\s*PORT\s*=\s*["']?(\d+)["']?\s*$/m.exec(
      fs.readFileSync(ENV_FILE, "utf8"),
    );
    if (m) return m[1];
  } catch {
    // Missing env file is reported by the deploy script, not here.
  }
  return "3000";
}

module.exports = {
  apps: [
    {
      name: "usdegrees-web",
      script: "server.js",
      cwd: `${BASE}/current`,
      node_args: `--env-file=${ENV_FILE}`,
      env: {
        NODE_ENV: "production",
        PORT: readPort(),
        // Explicit: the standalone server binds to $HOSTNAME, and PM2 would
        // otherwise inherit the machine's hostname from the shell.
        HOSTNAME: "0.0.0.0",
      },
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
