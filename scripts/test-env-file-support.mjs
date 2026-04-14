import assert from "node:assert/strict";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const envFilePath = path.join(os.tmpdir(), "task-checklist.env.test.local");

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

async function run() {
  const sampleEnv = [
    `FIREBASE_CONFIG_DEV_JSON='{"apiKey":"dotenv-dev-key","authDomain":"task-checklist-dev.firebaseapp.com","projectId":"dotenv-dev-project","appId":"dotenv-dev-app","storageBucket":"dotenv-dev-bucket","messagingSenderId":"dotenv-dev-msg"}'`,
    `FIREBASE_CONFIG_PROD_JSON='{"apiKey":"dotenv-prod-key","authDomain":"task-checklist-prod.firebaseapp.com","projectId":"dotenv-prod-project","appId":"dotenv-prod-app","storageBucket":"dotenv-prod-bucket","messagingSenderId":"dotenv-prod-msg"}'`,
    "FIREBASE_ENV_HOSTS_DEV=task-checklist-dev.web.app,task-checklist-dev.firebaseapp.com",
    "FIREBASE_ENV_HOSTS_PROD=task-checklist-prod.web.app,task-checklist-prod.firebaseapp.com",
  ].join("\n");

  await writeFile(envFilePath, `${sampleEnv}\n`, "utf8");

  try {
    await rm("build", { recursive: true, force: true });
    await rm("dist", { recursive: true, force: true });

    const result = await runNpmScript("build:hosting", {
      TASK_CHECKLIST_SKIP_ENV_FILES: "",
      TASK_CHECKLIST_ENV_FILES: envFilePath,
      FIREBASE_CONFIG_DEV_JSON: "",
      FIREBASE_CONFIG_PROD_JSON: "",
      FIREBASE_ENV_HOSTS_DEV: "",
      FIREBASE_ENV_HOSTS_PROD: "",
    });

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Prepared \.\/dist for deployment/);
    const generatedConfig = await readFile("src/config/firebase-config.js", "utf8");
    assert.match(generatedConfig, /dotenv-dev-project/);
    assert.match(generatedConfig, /dotenv-prod-project/);
    await assertExists("dist/build/src/main.js");
  } finally {
    await rm(envFilePath, { force: true });
  }

  process.stdout.write("Env file support tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
