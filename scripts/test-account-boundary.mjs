import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadAccountBoundary() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  await loadScript("src/core/account-boundary.js", context);
  return context.window.AppAccountBoundary;
}

async function loadScript(filePath, context) {
  const source = await readFile(filePath, "utf8");
  vm.runInContext(source, context, { filename: filePath });
}

async function run() {
  const boundary = await loadAccountBoundary();

  const claimEmpty = boundary.resolveOwnerTransition({ ownerUserId: null, dirty: false }, "u1");
  assert.equal(claimEmpty.kind, "claim-empty-owner");
  assert.equal(claimEmpty.blocked, false);
  assert.equal(claimEmpty.nextOwnerUserId, "u1");

  const accountSwitch = boundary.resolveOwnerTransition({ ownerUserId: "u1", dirty: false }, "u2");
  assert.equal(accountSwitch.kind, "account-switch");
  assert.equal(accountSwitch.blocked, true);
  assert.equal(accountSwitch.previousOwnerUserId, "u1");
  assert.equal(accountSwitch.nextOwnerUserId, "u2");

  const allowed = boundary.canScheduleAutoBackup({
    serviceOk: true,
    userId: "u1",
    ownerUserId: "u1",
    dirty: true,
    serverAhead: false,
    busy: false,
    accountSwitchBlocked: false,
  });
  assert.equal(allowed, true);

  const blocked = boundary.canScheduleAutoBackup({
    serviceOk: true,
    userId: "u1",
    ownerUserId: "u1",
    dirty: true,
    serverAhead: false,
    busy: false,
    accountSwitchBlocked: true,
  });
  assert.equal(blocked, false);

  process.stdout.write("Account boundary tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
