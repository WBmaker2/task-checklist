import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { ensureFirebaseConfig } from "./generate-firebase-config.mjs";

function withEnv(nextEnv, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(nextEnv)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

async function evaluateGeneratedConfig({ hostname, search = "" }) {
  await ensureFirebaseConfig();
  const source = await readFile("src/config/firebase-config.js", "utf8");
  const context = {
    window: {
      location: {
        hostname,
        search,
      },
    },
    URLSearchParams,
  };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "src/config/firebase-config.js" });
  return {
    env: context.window.FIREBASE_ENV,
    config: context.window.FIREBASE_CONFIG,
  };
}

async function testUnknownHostDefaultsToDev() {
  await withEnv(
    {
      TASK_CHECKLIST_SKIP_ENV_FILES: "true",
      FIREBASE_CONFIG_DEV_JSON: JSON.stringify({
        apiKey: "dev-key",
        authDomain: "task-checklist-dev.firebaseapp.com",
        projectId: "task-checklist-dev",
        appId: "dev-app",
        storageBucket: "dev-bucket",
        messagingSenderId: "dev-msg",
      }),
      FIREBASE_CONFIG_PROD_JSON: JSON.stringify({
        apiKey: "prod-key",
        authDomain: "task-checklist-prod.firebaseapp.com",
        projectId: "task-checklist-prod",
        appId: "prod-app",
        storageBucket: "prod-bucket",
        messagingSenderId: "prod-msg",
      }),
      FIREBASE_ENV_HOSTS_DEV: "task-checklist-dev.web.app,task-checklist-dev.firebaseapp.com",
      FIREBASE_ENV_HOSTS_PROD: "task-checklist-prod.web.app,task-checklist-prod.firebaseapp.com",
    },
    async () => {
      const result = await evaluateGeneratedConfig({ hostname: "preview.example.com" });
      assert.equal(result.env, "dev");
      assert.equal(result.config.projectId, "task-checklist-dev");
    }
  );
}

async function testKnownProdHostUsesProd() {
  await withEnv(
    {
      TASK_CHECKLIST_SKIP_ENV_FILES: "true",
      FIREBASE_CONFIG_DEV_JSON: JSON.stringify({
        apiKey: "dev-key",
        authDomain: "task-checklist-dev.firebaseapp.com",
        projectId: "task-checklist-dev",
        appId: "dev-app",
        storageBucket: "dev-bucket",
        messagingSenderId: "dev-msg",
      }),
      FIREBASE_CONFIG_PROD_JSON: JSON.stringify({
        apiKey: "prod-key",
        authDomain: "task-checklist-prod.firebaseapp.com",
        projectId: "task-checklist-prod",
        appId: "prod-app",
        storageBucket: "prod-bucket",
        messagingSenderId: "prod-msg",
      }),
      FIREBASE_ENV_HOSTS_DEV: "task-checklist-dev.web.app,task-checklist-dev.firebaseapp.com",
      FIREBASE_ENV_HOSTS_PROD: "task-checklist-prod.web.app,task-checklist-prod.firebaseapp.com",
    },
    async () => {
      const result = await evaluateGeneratedConfig({ hostname: "task-checklist-prod.web.app" });
      assert.equal(result.env, "prod");
      assert.equal(result.config.projectId, "task-checklist-prod");
      assert.equal(result.config.authDomain, "task-checklist-prod.web.app");
    }
  );
}

async function run() {
  await testUnknownHostDefaultsToDev();
  await testKnownProdHostUsesProd();
  process.stdout.write("Firebase config tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
