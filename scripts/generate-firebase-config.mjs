import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadEnvFiles } from "./load-env-files.mjs";

const outputPath = path.join("src", "config", "firebase-config.js");
const requiredKeys = ["apiKey", "authDomain", "projectId", "appId", "storageBucket", "messagingSenderId"];

function readJson(name) {
  const raw = (process.env[name] || "").trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    throw new Error(`${name} must be valid JSON: ${error.message}`);
  }
}

function sanitizeConfig(config) {
  const input = config && typeof config === "object" ? config : {};
  return {
    apiKey: String(input.apiKey || "").trim(),
    authDomain: String(input.authDomain || "").trim(),
    projectId: String(input.projectId || "").trim(),
    appId: String(input.appId || "").trim(),
    storageBucket: String(input.storageBucket || "").trim(),
    messagingSenderId: String(input.messagingSenderId || "").trim(),
  };
}

function readHostList(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function uniqueHosts(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildDefaultHosts(config) {
  const hosts = [];
  if (config.authDomain) {
    hosts.push(config.authDomain.toLowerCase());
  }
  if (config.projectId) {
    hosts.push(`${config.projectId.toLowerCase()}.web.app`);
    hosts.push(`${config.projectId.toLowerCase()}.firebaseapp.com`);
  }
  return uniqueHosts(hosts);
}

function missingKeys(config) {
  return requiredKeys.filter((key) => !config[key]);
}

function toLiteral(config) {
  return JSON.stringify(config, null, 6);
}

export async function ensureFirebaseConfig() {
  await loadEnvFiles();

  const dev = sanitizeConfig(readJson("FIREBASE_CONFIG_DEV_JSON"));
  const prod = sanitizeConfig(readJson("FIREBASE_CONFIG_PROD_JSON"));
  const requireConfig = String(process.env.REQUIRE_FIREBASE_CONFIG || "").trim().toLowerCase() === "true";
  const devHosts = uniqueHosts([...buildDefaultHosts(dev), ...readHostList("FIREBASE_ENV_HOSTS_DEV")]);
  const prodHosts = uniqueHosts([...buildDefaultHosts(prod), ...readHostList("FIREBASE_ENV_HOSTS_PROD")]);

  const devMissing = missingKeys(dev);
  const prodMissing = missingKeys(prod);

  if (requireConfig && (devMissing.length || prodMissing.length)) {
    const parts = [];
    if (devMissing.length) {
      parts.push(`dev missing: ${devMissing.join(", ")}`);
    }
    if (prodMissing.length) {
      parts.push(`prod missing: ${prodMissing.join(", ")}`);
    }
    throw new Error(`Firebase config is required for this build. ${parts.join(" / ")}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });

  const source = `(function () {
  const LOCAL_HOSTS = new Set(["", "localhost", "127.0.0.1"]);

  const CONFIGS = {
    dev: ${toLiteral(dev)},
    prod: ${toLiteral(prod)},
  };
  const HOSTS = {
    dev: ${JSON.stringify(devHosts, null, 6)},
    prod: ${JSON.stringify(prodHosts, null, 6)},
  };

  function normalizeHost(value) {
    return String(value || "").trim().toLowerCase();
  }

  function resolveFirebaseEnv() {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("firebaseEnv") || window.FIREBASE_ENV || "").trim().toLowerCase();
    if (requested === "dev" || requested === "prod") {
      return requested;
    }
    return "";
  }

  function resolveEnvFromHost(hostname) {
    if (LOCAL_HOSTS.has(hostname)) {
      return "dev";
    }
    if (HOSTS.dev.includes(hostname)) {
      return "dev";
    }
    if (HOSTS.prod.includes(hostname)) {
      return "prod";
    }
    return "dev";
  }

  const env = resolveFirebaseEnv();
  const hostname = normalizeHost(window.location.hostname);
  const resolvedEnv = env || resolveEnvFromHost(hostname);
  const config = { ...CONFIGS[resolvedEnv] };
  const knownHosts = HOSTS[resolvedEnv] || [];

  if (knownHosts.includes(hostname) && hostname) {
    config.authDomain = hostname;
  }

  window.FIREBASE_ENV = resolvedEnv;
  window.FIREBASE_HOSTS = HOSTS;
  window.FIREBASE_CONFIGS = CONFIGS;
  window.FIREBASE_CONFIG = config;
})();
`;

  await writeFile(outputPath, source, "utf8");

  const hasCompleteConfig = !devMissing.length && !prodMissing.length;
  const summary = hasCompleteConfig
    ? "Firebase config generated from environment variables."
    : "Firebase config generated. Missing values remain blank until environment variables are provided.";

  process.stdout.write(`${summary}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureFirebaseConfig().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
