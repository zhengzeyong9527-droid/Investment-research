#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/investoday-api.js <endpoint-or-command> [key=value ...]");
  console.log("Example: node scripts/investoday-api.js list");
  process.exit(args.length === 0 ? 1 : 0);
}

const result = spawnSync("investoday-api", args, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  console.error(`Failed to run investoday-api: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 0);
