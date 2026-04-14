import assert from "node:assert/strict";
import { access, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runNpmScript(scriptName, envOverrides = {}) {
  return new Promise((resolve) => {
    const child = spawn(npmCommand, ["run", scriptName], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...envOverrides,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function assertExists(filePath) {
  await access(filePath);
}

async function readScripts() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  return packageJson.scripts || {};
}

async function testLocalBuildAllowsMissingConfig() {
  await rm("build", { recursive: true, force: true });

  const result = await runNpmScript("build", {
    TASK_CHECKLIST_SKIP_ENV_FILES: "true",
    REQUIRE_FIREBASE_CONFIG: "",
    FIREBASE_CONFIG_DEV_JSON: "",
    FIREBASE_CONFIG_PROD_JSON: "",
    FIREBASE_ENV_HOSTS_DEV: "",
    FIREBASE_ENV_HOSTS_PROD: "",
  });

  assert.equal(result.code, 0);
  assert.match(result.stdout, /Missing values remain blank/);
  await assertExists("build/src/App.js");
  await assertExists("build/src/main.js");
  await assertExists("build/src/config/firebase-config.js");
  await assertExists("build/styles/main.css");
}

async function testStrictBuildRejectsMissingConfig() {
  const result = await runNpmScript("build:strict", {
    TASK_CHECKLIST_SKIP_ENV_FILES: "true",
    REQUIRE_FIREBASE_CONFIG: "true",
    FIREBASE_CONFIG_DEV_JSON: "",
    FIREBASE_CONFIG_PROD_JSON: "",
    FIREBASE_ENV_HOSTS_DEV: "",
    FIREBASE_ENV_HOSTS_PROD: "",
  });

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Firebase config is required for this build/);
}

async function testHostingBuildUsesStrictEntry() {
  const scripts = await readScripts();
  assert.equal(scripts.build, "node scripts/build.mjs");
  assert.equal(scripts["build:strict"], "REQUIRE_FIREBASE_CONFIG=true node scripts/build.mjs");
  assert.match(scripts["build:hosting"], /^npm run build:strict\b/);

  const missingConfigResult = await runNpmScript("build:hosting", {
    TASK_CHECKLIST_SKIP_ENV_FILES: "true",
    REQUIRE_FIREBASE_CONFIG: "",
    FIREBASE_CONFIG_DEV_JSON: "",
    FIREBASE_CONFIG_PROD_JSON: "",
    FIREBASE_ENV_HOSTS_DEV: "",
    FIREBASE_ENV_HOSTS_PROD: "",
  });

  assert.equal(missingConfigResult.code, 1);
  assert.match(
    `${missingConfigResult.stdout}\n${missingConfigResult.stderr}`,
    /Firebase config is required for this build/
  );

  await rm("build", { recursive: true, force: true });
  await rm("dist", { recursive: true, force: true });

  const successResult = await runNpmScript("build:hosting", {
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
  });

  assert.equal(successResult.code, 0);
  assert.match(successResult.stdout, /Firebase config generated from environment variables/);
  assert.match(successResult.stdout, /Prepared \.\/dist for deployment/);
  await assertExists("dist/index.html");
  await assertExists("dist/build/src/App.js");
  await assertExists("dist/build/src/main.js");
  await assertExists("dist/build/styles/main.css");
}

async function run() {
  await testLocalBuildAllowsMissingConfig();
  await testStrictBuildRejectsMissingConfig();
  await testHostingBuildUsesStrictEntry();
  process.stdout.write("Build mode tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
