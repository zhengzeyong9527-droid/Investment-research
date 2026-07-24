#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_BASE_URL = "http://61.142.2.100:1443/data";
const args = process.argv.slice(2);

function findConfigFile() {
  const candidates = [];
  let cursor = process.cwd();
  while (true) {
    candidates.push(path.join(cursor, "gs-api.config.json"));
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  candidates.push(path.resolve(__dirname, "..", "gs-api.config.json"));
  candidates.push(path.resolve(__dirname, "..", "..", "gs-api.config.json"));
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function loadConfig() {
  const configFile = findConfigFile();
  const fileConfig = configFile ? JSON.parse(fs.readFileSync(configFile, "utf8")) : {};
  return {
    baseUrl:
      process.env.GS_API_BASE_URL ||
      process.env.BROKER_API_BASE_URL ||
      fileConfig.GS_API_BASE_URL ||
      fileConfig.baseUrl ||
      fileConfig.base_url ||
      DEFAULT_BASE_URL,
    apiKey:
      process.env.GS_API_KEY ||
      process.env.BROKER_API_KEY ||
      fileConfig.GS_API_KEY ||
      fileConfig.apiKey ||
      fileConfig.api_key
  };
}

function printHelp() {
  console.log([
    "Usage:",
    "  node scripts/gs-api.js status",
    "  node scripts/gs-api.js list [key=value ...]",
    "  node scripts/gs-api.js <endpoint> [key=value ...] [--method GET|POST] [--body-json '<json>'] [--raw]",
    "",
    "Examples:",
    "  node scripts/gs-api.js stock/basic-info stockCode=600519",
    "  node scripts/gs-api.js stock/val-indicators --method POST --body-json '{\"stockCode\":\"600519\"}'",
    "",
    "Config:",
    "  API key is optional for the default broker intranet endpoint.",
    `  Default API base URL: ${DEFAULT_BASE_URL}`
  ].join("\n"));
}

function printStatus() {
  const config = loadConfig();
  console.log(JSON.stringify({
    ok: true,
    cli: "node scripts/gs-api.js",
    baseUrl: config.baseUrl,
    apiKeyRequired: false,
    hasOptionalApiKey: Boolean(config.apiKey),
    optionalApiKeySource: process.env.GS_API_KEY ? "GS_API_KEY" : (process.env.BROKER_API_KEY ? "BROKER_API_KEY" : null),
    node: process.version
  }, null, 2));
}

function coerceValue(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.includes(",")) return value.split(",").map((item) => coerceValue(item.trim()));
  return value;
}

function parseBodyItems(argv, startIndex) {
  const body = {};
  let i = startIndex;
  while (i < argv.length) {
    const part = argv[i];
    if (part.startsWith("--")) break;
    const equalIndex = part.indexOf("=");
    if (equalIndex <= 0) {
      throw new Error(`Invalid --body item: ${part}`);
    }
    body[part.slice(0, equalIndex)] = coerceValue(part.slice(equalIndex + 1));
    i += 1;
  }
  return { body, nextIndex: i };
}

function parseArgs(argv) {
  const command = argv[0];
  const normalizedCommand = String(command || "").replace(/^\/+/, "");
  const endpoint = normalizedCommand;
  let method = "GET";
  let bodyJson;
  let raw = false;
  const params = {};

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--method") {
      method = String(argv[++i] || "").toUpperCase();
      continue;
    }
    if (arg === "--body-json") {
      method = method === "GET" ? "POST" : method;
      bodyJson = argv[++i];
      continue;
    }
    if (arg === "--body") {
      method = method === "GET" ? "POST" : method;
      const parsed = parseBodyItems(argv, i + 1);
      bodyJson = JSON.stringify(parsed.body);
      i = parsed.nextIndex - 1;
      continue;
    }
    if (arg === "--raw") {
      raw = true;
      continue;
    }
    const equalIndex = arg.indexOf("=");
    if (equalIndex > 0) {
      params[arg.slice(0, equalIndex)] = arg.slice(equalIndex + 1);
      continue;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  }

  if (!endpoint) throw new Error("Missing endpoint.");
  if (!["GET", "POST"].includes(method)) throw new Error(`Unsupported method: ${method}`);
  return { endpoint, method, bodyJson, raw, params };
}

function buildRequestUrl(baseUrl, endpoint, params) {
  const root = String(baseUrl).replace(/\/+$/, "");
  const cleanEndpoint = String(endpoint).replace(/^\/+/, "");
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${root}/${cleanEndpoint}${query ? `?${query}` : ""}`;
}

async function main() {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  if (args[0] === "status") {
    printStatus();
    return;
  }

  const config = loadConfig();
  const request = parseArgs(args);
  const queryParams = config.apiKey ? { apiKey: config.apiKey } : {};

  let body;
  const headers = { "accept-encoding": "identity" };
  if (request.method === "GET") {
    for (const [key, value] of Object.entries(request.params)) {
      queryParams[key] = value;
    }
  } else {
    headers["content-type"] = "application/json";
    for (const [key, value] of Object.entries(request.params)) {
      queryParams[key] = value;
    }
    body = request.bodyJson
      ? request.bodyJson
      : JSON.stringify(Object.fromEntries(Object.entries(request.params).map(([key, value]) => [key, coerceValue(value)])));
  }

  const url = buildRequestUrl(config.baseUrl, request.endpoint, queryParams);
  const response = await fetch(url, { method: request.method, headers, body });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const successCode = (code) => code === 0 || code === "0" || code === "Success" || code === "success";
  const output = !request.raw && payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "code")
    ? successCode(payload.code)
      ? payload.data
      : payload
    : payload;

  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "code") && !successCode(payload.code)) {
    console.error(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  console.log(typeof output === "string" ? output : JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(`gs-api.js failed: ${error.message}`);
  process.exit(1);
});
