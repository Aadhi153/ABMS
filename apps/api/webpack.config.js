const nodeExternals = require("webpack-node-externals");

/**
 * @abms/shared and @abms/ui are source-only workspace packages (no build step),
 * so they must be bundled (compiled via ts-loader) rather than externalized —
 * Node's own runtime resolver can't load their extensionless TS imports directly.
 * @abms/database ships compiled JS from `prisma generate`, so it stays external.
 */
module.exports = function (options) {
  return {
    ...options,
    externals: [nodeExternals({ allowlist: [/^@abms\/shared/, /^@abms\/ui/] })],
  };
};
