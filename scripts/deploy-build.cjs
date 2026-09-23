/**
 * Shared production build for Vercel, Netlify, and other Node hosts.
 * Generates Prisma client, applies migrations when DATABASE_URL is set, then runs next build.
 */
const { execSync } = require("node:child_process");

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

run("npx prisma generate");

const databaseUrl = process.env.DATABASE_URL?.trim();
if (databaseUrl) {
  run("npx prisma migrate deploy");
} else {
  console.warn(
    "[deploy-build] DATABASE_URL is not set — skipping prisma migrate deploy. " +
      "Set DATABASE_URL in your host's environment variables before going live."
  );
}

run("npx next build");
