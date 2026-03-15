import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

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

function missingKeys(config) {
  return requiredKeys.filter((key) => !config[key]);
}

function toLiteral(config) {
  return JSON.stringify(config, null, 6);
}

export async function ensureFirebaseConfig() {
  const dev = sanitizeConfig(readJson("FIREBASE_CONFIG_DEV_JSON"));
  const prod = sanitizeConfig(readJson("FIREBASE_CONFIG_PROD_JSON"));
  const requireConfig = String(process.env.REQUIRE_FIREBASE_CONFIG || "").trim().toLowerCase() === "true";

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

  function resolveFirebaseEnv() {
    const params = new URLSearchParams(window.location.search);
    const requested = (params.get("firebaseEnv") || window.FIREBASE_ENV || "").trim().toLowerCase();
    if (requested === "dev" || requested === "prod") {
      return requested;
    }

    const hostname = (window.location.hostname || "").trim().toLowerCase();
    return LOCAL_HOSTS.has(hostname) ? "dev" : "prod";
  }

  const env = resolveFirebaseEnv();

  window.FIREBASE_ENV = env;
  window.FIREBASE_CONFIGS = CONFIGS;
  window.FIREBASE_CONFIG = { ...CONFIGS[env] };
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
