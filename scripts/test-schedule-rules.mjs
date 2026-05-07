import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadUtils() {
  const context = { console, Date };
  context.window = {};
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(await readFile("src/core/utils.js", "utf8"), context, { filename: "src/core/utils.js" });

  return context.window.AppUtils;
}

async function run() {
  const utils = await loadUtils();
  const { fmtDate, getFirstWorkdayOfMonthWeek, shouldShow } = utils;

  assert.equal(fmtDate(getFirstWorkdayOfMonthWeek(2026, 4, 1)), "2026-05-01");
  assert.equal(shouldShow({ repeatType: "monthly", repeatWeek: 1 }, new Date(2026, 4, 1)), true);
  assert.equal(shouldShow({ repeatType: "monthly", repeatWeek: 1 }, new Date(2026, 4, 4)), false);
  assert.equal(fmtDate(getFirstWorkdayOfMonthWeek(2026, 7, 1)), "2026-08-03");
  assert.equal(shouldShow({ repeatType: "monthly", repeatWeek: 1 }, new Date(2026, 7, 3)), true);
  assert.equal(shouldShow({ repeatType: "weekly", repeatDay: 2, repeatWeek: null }, new Date(2026, 4, 6)), true);
  assert.equal(shouldShow({ repeatType: "daily", repeatDay: null, repeatWeek: null }, new Date(2026, 4, 4)), true);
  assert.equal(shouldShow({ repeatType: "daily", repeatDay: null, repeatWeek: null }, new Date(2026, 4, 2)), false);

  process.stdout.write("Schedule rule tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
