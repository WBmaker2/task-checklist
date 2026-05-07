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

  const keepTask = {
    id: "keep",
    name: "유지 업무",
    categoryId: "c1",
    repeatType: "daily",
    repeatDay: null,
    repeatWeek: null,
    priority: "medium",
    extra: { note: "보존 대상" },
  };
  const removeTask = {
    id: "remove",
    name: "삭제 업무",
    categoryId: "c1",
    repeatType: "weekly",
    repeatDay: 2,
    repeatWeek: 1,
    priority: "low",
    customField: "custom",
  };
  const preserveCategory = { id: "c1", name: "카테고리" };
  const preserveAppData = {
    tasks: [keepTask, removeTask],
    cats: [preserveCategory],
    checks: {
      "keep_2026-05-07": "2026-05-07T00:00:00.000Z",
      "remove_2026-05-07": "2026-05-07T01:00:00.000Z",
      "remove_2026-05-08": "2026-05-08T01:00:00.000Z",
      "remove_2026-05-09_invalid": "2026-05-09T00:00:00.000Z",
      "no_underscore": "2026-05-07T00:00:00.000Z",
    },
  };
  const preserveOriginal = model.deleteTaskFromAppData(preserveAppData, " ");
  assert.equal(preserveOriginal.tasks.length, 2);
  assert.equal(preserveOriginal.tasks[0], keepTask);
  assert.equal(preserveOriginal.tasks[1], removeTask);
  assert.equal(preserveOriginal.cats[0], preserveCategory);
  assert.equal(preserveOriginal.cats.length, 1);
  assert.equal(preserveOriginal.checks["remove_2026-05-07"], "2026-05-07T01:00:00.000Z");
  assert.equal(preserveOriginal.checks["remove_2026-05-08"], "2026-05-08T01:00:00.000Z");
  assert.equal(preserveOriginal.checks["no_underscore"], "2026-05-07T00:00:00.000Z");
  assert.equal(preserveOriginal.tasks.length, 2);

  const preserveDeleted = model.deleteTaskFromAppData(preserveAppData, "remove");
  assert.equal(preserveDeleted.tasks.length, 1);
  assert.equal(preserveDeleted.tasks[0], keepTask);
  assert.equal(preserveDeleted.cats[0], preserveCategory);
  assert.equal(preserveDeleted.tasks[0].id, "keep");
  assert.equal(preserveDeleted.tasks[0].repeatDay, null);
  assert.equal(preserveDeleted.tasks[0].repeatWeek, null);
  assert.equal(preserveDeleted.tasks[0].extra.note, "보존 대상");
  assert.equal(preserveDeleted.tasks[0].name, "유지 업무");
  assert.equal(preserveDeleted.cats.length, 1);
  assert.equal(preserveDeleted.checks["keep_2026-05-07"], "2026-05-07T00:00:00.000Z");
  assert.equal(preserveDeleted.checks["remove_2026-05-07"], undefined);
  assert.equal(preserveDeleted.checks["remove_2026-05-08"], undefined);
  assert.equal(preserveDeleted.checks["remove_2026-05-09_invalid"], "2026-05-09T00:00:00.000Z");
  assert.equal(preserveDeleted.checks["no_underscore"], "2026-05-07T00:00:00.000Z");

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

  const consistencyData = {
    tasks: [
      { id: "t1", name: "업무1", categoryId: "c1", repeatType: "daily", priority: "medium" },
      { id: "t2", name: "업무2", categoryId: "c2", repeatType: "weekly", repeatDay: 1, priority: "low" },
    ],
    cats: [
      { id: "c1", name: "Cat 1", color: "#111111", icon: "1" },
      { id: "c2", name: "Cat 2", color: "#222222", icon: "2" },
    ],
    checks: {
      "t1_2026-05-07": "2026-05-07T00:00:00.000Z",
      "t2_2026-05-07": "2026-05-07T00:00:00.000Z",
    },
  };

  const taskDeleted = model.deleteTaskFromAppData(consistencyData, "t1");
  assert.equal(taskDeleted.tasks.length, 1);
  assert.equal(taskDeleted.tasks.some((task) => task.id === "t1"), false);
  assert.equal(taskDeleted.checks["t1_2026-05-07"], undefined);
  assert.equal(taskDeleted.checks["t2_2026-05-07"], "2026-05-07T00:00:00.000Z");

  const c1Usage = model.canDeleteCategory(consistencyData, "c1");
  assert.equal(c1Usage.ok, false);
  assert.equal(c1Usage.usage, 1);
  assert.equal(c1Usage.message, `이 카테고리를 사용하는 업무가 ${c1Usage.usage}개 있습니다.`);

  const unused = model.canDeleteCategory(consistencyData, "unused");
  assert.equal(unused.ok, true);
  assert.equal(unused.usage, 0);
  assert.equal(unused.message, "");

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
