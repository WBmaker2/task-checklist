import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadDataModel() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(await readFile("src/core/data-model.js", "utf8"), context, {
    filename: "src/core/data-model.js",
  });

  return context.window.AppDataModel;
}

async function run() {
  const model = await loadDataModel();

  assert.equal(model.BACKUP_SCHEMA_VERSION, 2);

  const normalized = model.normalizeAppData({
    tasks: [
      { id: "", name: "", categoryId: "missing", repeatType: "daily", repeatDay: 3, repeatWeek: 2, priority: "high" },
      {
        id: "abc_def",
        name: "수업 준비",
        categoryId: "missing",
        repeatType: "bad",
        repeatDay: 9,
        repeatWeek: 9,
        priority: "weird",
        memo: "  메모  ",
      },
      {
        id: "noCheck",
        name: "체크없는 업무",
        repeatType: "monthly",
        repeatDay: 1,
        repeatWeek: 2,
        priority: "high",
      },
    ],
    cats: [{ id: "c1", name: "기본" }, { id: "", name: "" }],
    checks: {
      "abc_def_2026-05-07": "2026-05-07T00:00:00.000Z",
      "missing_2026-05-07": "2026-05-07T00:00:00.000Z",
      "abc_def_2026-13-01": "2026-13-01T00:00:00.000Z",
      "abc_def": "2026-05-07T00:00:00.000Z",
      "abc_def_2026-05-07_extra": "2026-05-07T00:00:00.000Z",
      "abc_def_2026-05-07": "2026-05-07T00:00:00.000Z",
      "not-a-key": "2026-05-07T00:00:00.000Z",
    },
  });

  assert.equal(normalized.tasks.length, 2);
  assert.equal(normalized.tasks[0].id, "abc_def");
  assert.equal(normalized.tasks[0].name, "수업 준비");
  assert.equal(normalized.tasks[0].memo, "메모");
  assert.equal(normalized.tasks[0].repeatType, "weekly");
  assert.equal(normalized.tasks[0].repeatDay, 0);
  assert.equal(normalized.tasks[0].repeatWeek, 1);
  assert.equal(normalized.tasks[0].priority, "medium");
  assert.equal(normalized.tasks[0].categoryId, "c1");
  assert.equal(normalized.tasks[1].id, "noCheck");
  assert.equal(normalized.tasks[1].categoryId, "c1");

  assert.equal(normalized.cats.length, 1);
  assert.equal(normalized.cats[0].id, "c1");
  assert.equal(normalized.cats[0].name, "기본");
  assert.equal(normalized.cats[0].color, "#94a3b8");
  assert.equal(normalized.cats[0].icon, "📌");

  assert.equal(normalized.checks["abc_def_2026-05-07"], "2026-05-07T00:00:00.000Z");
  assert.equal(normalized.checks["missing_2026-05-07"], undefined);
  assert.equal(normalized.checks["abc_def_2026-13-01"], undefined);
  assert.equal(normalized.checks["abc_def"], undefined);
  assert.equal(normalized.checks["abc_def_2026-05-07_extra"], undefined);
  assert.equal(normalized.checks["not-a-key"], undefined);
  assert.equal(Object.keys(normalized.checks).length, 1);

  const deleted = model.deleteTaskFromAppData(normalized, "abc_def");
  assert.equal(deleted.tasks.length, 1);
  assert.equal(deleted.tasks[0].id, "noCheck");
  assert.equal(Object.keys(deleted.checks).length, 0);

  const parsedV2 = model.extractBackupPayload({
    schemaVersion: 2,
    data: normalized,
  });
  assert.equal(parsedV2.tasks.length, 2);
  assert.equal(parsedV2.cats.length, 1);
  assert.equal(parsedV2.checks["abc_def_2026-05-07"], "2026-05-07T00:00:00.000Z");

  const parsedV1 = model.extractBackupPayload({
    schemaVersion: 1,
    data: {
      tasks: normalized.tasks,
      cats: normalized.cats,
      checks: { "abc_def_2026-05-07": "2026-05-07T00:00:00.000Z" },
    },
  });
  assert.equal(parsedV1.tasks.length, 2);
  assert.equal(parsedV1.cats.length, 1);
  assert.equal(parsedV1.checks["abc_def_2026-05-07"], "2026-05-07T00:00:00.000Z");

  const parsedLegacy = model.extractBackupPayload({
    tasks: normalized.tasks,
    cats: normalized.cats,
    checks: normalized.checks,
  });
  assert.equal(parsedLegacy.tasks.length, 2);
  assert.equal(parsedLegacy.cats.length, 1);

  const usage = model.getCategoryUsage(
    {
      tasks: [
        { id: "a", name: "A", categoryId: "c1", repeatType: "daily", repeatDay: 0, repeatWeek: 1, priority: "low", memo: "" },
        { id: "b", name: "B", categoryId: "c1", repeatType: "weekly", repeatDay: 1, repeatWeek: 1, priority: "high", memo: "" },
      ],
      cats: [{ id: "c1", name: "카테고리" }],
      checks: {},
    },
    "c1"
  );
  assert.equal(usage, 2);

  assert.equal(model.toBackupDocument({ tasks: [], cats: [], checks: {} }).schemaVersion, 2);
  assert.deepEqual(model.toBackupDocument({ tasks: [], cats: [], checks: {} }).data.tasks, []);

  process.stdout.write("Data model tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
