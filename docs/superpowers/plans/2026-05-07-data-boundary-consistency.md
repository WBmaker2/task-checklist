# Data Boundary And Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계정 전환 시 데이터 오염을 막고, 백업 payload 검증, 삭제 정합성, 월간 반복 규칙을 테스트 가능한 구조로 안정화합니다.

**Architecture:** 현재 앱은 전역 `window.*` 모듈과 React UMD 런타임을 사용하므로, 새 로직도 같은 패턴의 작은 브라우저 스크립트로 추가합니다. 핵심 도메인 규칙은 순수 helper로 먼저 분리하고, `sync-controller`, `backup-service`, `Manage`, `Checklist`는 그 helper를 호출하도록 점진적으로 연결합니다. 저장소 구조는 유지하되 계정 경계와 데이터 정규화는 명시적인 상태와 테스트로 보호합니다.

**Tech Stack:** Static HTML, React UMD, Firebase compat SDK, Node.js VM-based smoke tests, esbuild

---

## Scope Map

이 계획은 분석에서 나온 1~4번 항목을 모두 다룹니다.

- 1번 계정 경계: 계정 전환 시 자동 백업 차단, 사용자 선택 전 데이터 업로드 금지
- 2번 백업 payload: schemaVersion 기반 검증/정규화, legacy 백업 호환 읽기
- 3번 데이터 정합성: 업무 삭제 시 체크 기록 정리, 카테고리 삭제 시 참조 보호, import/restore 정규화
- 4번 월간 반복 규칙: "월별 N주차 업무는 해당 7일 구간의 첫 근무일에 1회 발생"으로 명확화

이번 계획은 Firestore 컬렉션을 대규모로 쪼개는 마이그레이션은 포함하지 않습니다. 대신 schemaVersion과 payload 정규화를 먼저 넣어 이후 `meta`/`payload` 분리나 증분 동기화로 갈 수 있는 안전한 발판을 만듭니다.

## File Structure

- Create: `src/core/data-model.js`
  - 앱 데이터 스키마, 백업 payload 파싱, import/restore 정규화, 삭제 cleanup helper를 담당합니다.
- Create: `src/core/account-boundary.js`
  - 계정 전환 판단, 자동 백업 가능 여부, 계정 경계 차단 상태를 순수 함수로 계산합니다.
- Modify: `src/core/utils.js`
  - 월간 반복 규칙을 명확히 하고 기존 API 이름은 유지합니다.
- Modify: `src/core/backup-service.js`
  - 백업 쓰기/복원에서 `AppDataModel`을 사용하고 `schemaVersion: 2` payload를 저장합니다.
- Modify: `src/core/sync-controller.js`
  - 계정 전환 차단, import/restore 정규화, dirty suppression을 명시적으로 관리합니다.
- Modify: `src/App.js`
  - `Manage`에 `checks`, `setChecks`를 전달합니다.
- Modify: `src/pages/Manage.js`
  - 업무 삭제 cascade cleanup, 카테고리 삭제 참조 보호, task 저장 정규화를 적용합니다.
- Modify: `src/pages/Backup.js`
  - 계정 전환 차단 상태와 사용자 선택 액션을 표시합니다.
- Modify: `scripts/build.mjs`
  - 새 core 스크립트를 빌드 순서에 추가합니다.
- Modify: `index.html`
  - 새 core 스크립트를 런타임 로드 순서에 추가합니다.
- Modify: `package.json`
  - 새 테스트 스크립트를 추가합니다.
- Create: `scripts/test-data-model.mjs`
  - 데이터 정규화, legacy/v2 payload 파싱, 삭제 cleanup을 검증합니다.
- Create: `scripts/test-account-boundary.mjs`
  - 계정 전환과 자동 백업 차단 규칙을 검증합니다.
- Create: `scripts/test-schedule-rules.mjs`
  - 월간 반복 규칙과 기존 daily/weekly 규칙을 검증합니다.
- Modify: `scripts/test-sync.mjs`
  - `backup-service`가 v2 payload를 쓰고 legacy payload도 읽는지 검증을 보강합니다.
- Modify: `README.md`
  - 계정 전환 동작, 백업 schemaVersion, 월간 반복 규칙을 문서화합니다.
- Modify: `.github/workflows/deploy-firebase-hosting.yml`
  - 새 테스트를 배포 전 검증에 추가합니다.

---

### Task 1: Data Model Helper

**Files:**
- Create: `src/core/data-model.js`
- Create: `scripts/test-data-model.mjs`
- Modify: `scripts/build.mjs`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Write the failing data model tests**

Create `scripts/test-data-model.mjs` with VM loading for `src/core/data-model.js`.

```js
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

  const normalized = model.normalizeAppData({
    tasks: [
      { id: "id_t1", name: "A", categoryId: "c1", repeatType: "weekly", repeatDay: 2, priority: "high" },
      { id: "", name: "", categoryId: "missing" },
    ],
    cats: [{ id: "c1", name: "Cat", color: "#123456", icon: "C" }],
    checks: {
      "id_t1_2026-05-07": "2026-05-07T00:00:00.000Z",
      "missing_2026-05-07": "2026-05-07T00:00:00.000Z",
    },
  });

  assert.equal(normalized.tasks.length, 1);
  assert.equal(normalized.checks["id_t1_2026-05-07"], "2026-05-07T00:00:00.000Z");
  assert.equal(normalized.checks["missing_2026-05-07"], undefined);

  const deleted = model.deleteTaskFromAppData(normalized, "id_t1");
  assert.equal(deleted.tasks.length, 0);
  assert.deepEqual(deleted.checks, {});

  const parsedV2 = model.extractBackupPayload({
    schemaVersion: 2,
    data: normalized,
  });
  assert.equal(parsedV2.tasks.length, 1);

  const parsedLegacy = model.extractBackupPayload({
    tasks: normalized.tasks,
    cats: normalized.cats,
    checks: normalized.checks,
  });
  assert.equal(parsedLegacy.cats.length, 1);

  assert.equal(model.getCategoryUsage(normalized, "c1"), 1);
  process.stdout.write("Data model tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node scripts/test-data-model.mjs`

Expected: FAIL with `ENOENT` or `AppDataModel` missing.

- [ ] **Step 3: Implement `src/core/data-model.js`**

Create `src/core/data-model.js` with these exported browser globals:

```js
(function () {
  const BACKUP_SCHEMA_VERSION = 2;
  const DEFAULT_REPEAT_TYPE = "weekly";
  const DEFAULT_PRIORITY = "medium";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function cleanString(value) {
    return String(value || "").trim();
  }

  function normalizeCategory(raw, fallbackIndex) {
    const id = cleanString(raw?.id) || `cat_${fallbackIndex}`;
    const name = cleanString(raw?.name);
    if (!name) {
      return null;
    }
    return {
      id,
      name,
      color: cleanString(raw?.color) || "#94a3b8",
      icon: cleanString(raw?.icon) || "📌",
    };
  }

  function normalizeTask(raw, fallbackCategoryId) {
    const id = cleanString(raw?.id);
    const name = cleanString(raw?.name);
    if (!id || !name) {
      return null;
    }

    const repeatType = ["daily", "weekly", "monthly"].includes(raw.repeatType)
      ? raw.repeatType
      : DEFAULT_REPEAT_TYPE;
    const priority = ["high", "medium", "low"].includes(raw.priority)
      ? raw.priority
      : DEFAULT_PRIORITY;

    return {
      id,
      name,
      categoryId: cleanString(raw.categoryId) || fallbackCategoryId,
      repeatType,
      repeatDay: Number.isInteger(raw.repeatDay) && raw.repeatDay >= 0 && raw.repeatDay <= 4 ? raw.repeatDay : 0,
      repeatWeek: Number.isInteger(raw.repeatWeek) && raw.repeatWeek >= 1 && raw.repeatWeek <= 5 ? raw.repeatWeek : 1,
      priority,
      memo: cleanString(raw.memo),
    };
  }

  function normalizeChecks(rawChecks, taskIds) {
    const allowedTaskIds = new Set(taskIds);
    const next = {};

    for (const [key, value] of Object.entries(asObject(rawChecks))) {
      const separatorIndex = String(key).lastIndexOf("_");
      const taskId = separatorIndex > 0 ? String(key).slice(0, separatorIndex) : "";
      const datePart = separatorIndex > 0 ? String(key).slice(separatorIndex + 1) : "";
      if (!allowedTaskIds.has(taskId) || !/^\d{4}-\d{2}-\d{2}$/.test(datePart || "")) {
        continue;
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        continue;
      }
      next[key] = date.toISOString();
    }

    return next;
  }

  function normalizeAppData(raw) {
    const fallbackCats = window.AppConstants?.DEFAULT_CATEGORIES || [];
    const rawCats = asArray(raw?.cats);
    const cats = rawCats
      .map((cat, index) => normalizeCategory(cat, index))
      .filter(Boolean);
    const normalizedCats = cats.length > 0 ? cats : fallbackCats;
    const fallbackCategoryId = normalizedCats[0]?.id || "";
    const categoryIds = new Set(normalizedCats.map((cat) => cat.id));

    const tasks = asArray(raw?.tasks)
      .map((task) => normalizeTask(task, fallbackCategoryId))
      .filter(Boolean)
      .map((task) => ({
        ...task,
        categoryId: categoryIds.has(task.categoryId) ? task.categoryId : fallbackCategoryId,
      }));

    return {
      tasks,
      cats: normalizedCats,
      checks: normalizeChecks(raw?.checks, tasks.map((task) => task.id)),
    };
  }

  function extractBackupPayload(raw) {
    const root = asObject(raw);
    const payload = root.schemaVersion === BACKUP_SCHEMA_VERSION && root.data ? root.data : root;
    return normalizeAppData(payload);
  }

  function toBackupDocument(appData) {
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      data: normalizeAppData(appData),
    };
  }

  function deleteTaskFromAppData(appData, taskId) {
    const normalized = normalizeAppData(appData);
    return normalizeAppData({
      ...normalized,
      tasks: normalized.tasks.filter((task) => task.id !== taskId),
    });
  }

  function getCategoryUsage(appData, categoryId) {
    const normalized = normalizeAppData(appData);
    return normalized.tasks.filter((task) => task.categoryId === categoryId).length;
  }

  window.AppDataModel = {
    BACKUP_SCHEMA_VERSION,
    normalizeAppData,
    extractBackupPayload,
    toBackupDocument,
    deleteTaskFromAppData,
    getCategoryUsage,
  };
})();
```

- [ ] **Step 4: Add the new script to build and runtime order**

Modify `scripts/build.mjs`:

```js
const orderedSources = [
  "src/config/firebase-config.js",
  "src/core/constants.js",
  "src/core/theme.js",
  "src/core/utils.js",
  "src/core/data-model.js",
  "src/core/sync-state.js",
  ...
];
```

Modify `index.html`:

```html
<script src="./build/src/core/utils.js"></script>
<script src="./build/src/core/data-model.js"></script>
<script src="./build/src/core/sync-state.js"></script>
```

Modify `package.json`:

```json
"test:data-model": "node scripts/test-data-model.mjs"
```

- [ ] **Step 5: Run data model tests**

Run: `npm run test:data-model`

Expected: PASS with `Data model tests passed`

- [ ] **Step 6: Run existing smoke tests**

Run: `npm run test:sync && npm run build`

Expected: PASS with `Sync smoke tests passed` and `Built ... files into ./build`

- [ ] **Step 7: Commit**

```bash
git add src/core/data-model.js scripts/test-data-model.mjs scripts/build.mjs index.html package.json
git commit -m "Add app data model normalization"
```

---

### Task 2: Account Boundary And Auto Backup Lock

**Files:**
- Create: `src/core/account-boundary.js`
- Create: `scripts/test-account-boundary.mjs`
- Modify: `src/core/sync-controller.js`
- Modify: `src/pages/Backup.js`
- Modify: `scripts/build.mjs`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Write failing account boundary tests**

Create `scripts/test-account-boundary.mjs`.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadBoundary() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(await readFile("src/core/account-boundary.js", "utf8"), context, {
    filename: "src/core/account-boundary.js",
  });
  return context.window.AppAccountBoundary;
}

async function run() {
  const boundary = await loadBoundary();

  assert.deepEqual(
    boundary.resolveOwnerTransition({ ownerUserId: null, dirty: false }, "u1"),
    { kind: "claim-empty-owner", blocked: false, nextOwnerUserId: "u1" }
  );

  assert.deepEqual(
    boundary.resolveOwnerTransition({ ownerUserId: "u1", dirty: false }, "u2"),
    { kind: "account-switch", blocked: true, previousOwnerUserId: "u1", nextOwnerUserId: "u2" }
  );

  assert.equal(
    boundary.canScheduleAutoBackup({
      serviceOk: true,
      userId: "u2",
      ownerUserId: "u2",
      dirty: true,
      serverAhead: false,
      busy: false,
      accountSwitchBlocked: false,
    }),
    true
  );

  assert.equal(
    boundary.canScheduleAutoBackup({
      serviceOk: true,
      userId: "u2",
      ownerUserId: "u2",
      dirty: true,
      serverAhead: false,
      busy: false,
      accountSwitchBlocked: true,
    }),
    false
  );

  process.stdout.write("Account boundary tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the failing test**

Run: `node scripts/test-account-boundary.mjs`

Expected: FAIL with missing `src/core/account-boundary.js`.

- [ ] **Step 3: Implement `src/core/account-boundary.js`**

```js
(function () {
  function resolveOwnerTransition(syncMeta, nextUserId) {
    const ownerUserId = syncMeta?.ownerUserId || null;
    if (!nextUserId) {
      return { kind: "signed-out", blocked: false, nextOwnerUserId: null };
    }
    if (!ownerUserId) {
      return { kind: "claim-empty-owner", blocked: false, nextOwnerUserId: nextUserId };
    }
    if (ownerUserId !== nextUserId) {
      return {
        kind: "account-switch",
        blocked: true,
        previousOwnerUserId: ownerUserId,
        nextOwnerUserId: nextUserId,
      };
    }
    return { kind: "same-owner", blocked: false, nextOwnerUserId: nextUserId };
  }

  function canScheduleAutoBackup(input) {
    return Boolean(
      input?.serviceOk &&
        input?.userId &&
        input?.ownerUserId === input.userId &&
        input?.dirty &&
        !input?.serverAhead &&
        !input?.busy &&
        !input?.accountSwitchBlocked
    );
  }

  window.AppAccountBoundary = {
    resolveOwnerTransition,
    canScheduleAutoBackup,
  };
})();
```

- [ ] **Step 4: Add sync meta fields**

Modify `src/core/sync-controller.js`.

Extend `DEFAULT_SYNC_META`:

```js
accountSwitchBlocked: false,
blockedPreviousOwnerUserId: null,
```

Extend `normalizeSyncMeta`:

```js
accountSwitchBlocked: Boolean(meta.accountSwitchBlocked),
blockedPreviousOwnerUserId: typeof meta.blockedPreviousOwnerUserId === "string" ? meta.blockedPreviousOwnerUserId : null,
```

- [ ] **Step 5: Replace owner transition blocks with helper**

In both auth bootstrap and `onAuthStateChanged` paths, replace the repeated `ownerUserId` update with a helper inside `useSyncController`:

```js
const handleOwnerTransition = React.useCallback((nextUser) => {
  updateSyncMeta((prev) => {
    const transition = window.AppAccountBoundary.resolveOwnerTransition(prev, nextUser?.id || null);
    if (transition.kind === "account-switch") {
      return {
        ...prev,
        ownerUserId: transition.nextOwnerUserId,
        baseVersion: null,
        dirty: false,
        accountSwitchBlocked: true,
        blockedPreviousOwnerUserId: transition.previousOwnerUserId,
      };
    }
    if (transition.kind === "claim-empty-owner") {
      return {
        ...prev,
        ownerUserId: transition.nextOwnerUserId,
        accountSwitchBlocked: false,
        blockedPreviousOwnerUserId: null,
      };
    }
    return prev;
  });
}, [updateSyncMeta]);
```

After calling this helper for an account switch, set a warning status:

```js
setStatus({
  busy: false,
  level: "warn",
  conflict: true,
  conflictMeta: null,
  message: "다른 Google 계정으로 전환되었습니다. 현재 로컬 데이터를 이 계정에 연결할지, 서버 데이터를 복원할지 선택해 주세요.",
});
```

- [ ] **Step 6: Guard auto backup with `canScheduleAutoBackup`**

Replace the condition in the auto backup effect:

```js
const canAutoBackup = window.AppAccountBoundary.canScheduleAutoBackup({
  serviceOk: syncServiceState.ok,
  userId: syncUser?.id || null,
  ownerUserId: syncMeta.ownerUserId,
  dirty: syncMeta.dirty,
  serverAhead,
  busy: syncStatus.busy,
  accountSwitchBlocked: syncMeta.accountSwitchBlocked,
});
if (!canAutoBackup) {
  return undefined;
}
```

- [ ] **Step 7: Add explicit user actions**

Add actions in `sync-controller.js`:

```js
const claimLocalDataForCurrentUser = React.useCallback(async () => {
  const user = syncUserRef.current;
  if (!user) {
    return;
  }
  updateSyncMeta((prev) => ({
    ...prev,
    ownerUserId: user.id,
    baseVersion: null,
    dirty: true,
    accountSwitchBlocked: false,
    blockedPreviousOwnerUserId: null,
    localUpdatedAt: new Date().toISOString(),
  }));
  setStatus({
    busy: false,
    level: "warn",
    conflict: false,
    conflictMeta: null,
    message: "현재 로컬 데이터를 이 계정에 연결했습니다. 필요하면 지금 백업을 실행하세요.",
  });
}, [setStatus, updateSyncMeta]);
```

Expose it through `backupActions`:

```js
claimLocalDataForCurrentUser,
```

- [ ] **Step 8: Show blocked state in Backup UI**

Modify `src/pages/Backup.js` to show a warning block when `syncMeta?.accountSwitchBlocked`.

```jsx
{user && syncMeta?.accountSwitchBlocked && (
  <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 12 }}>
    Google 계정이 바뀌었습니다. 자동 백업은 잠시 멈췄습니다. 서버 데이터를 복원하거나 현재 로컬 데이터를 이 계정에 연결해 주세요.
  </div>
)}
```

Add a button near backup controls:

```jsx
<button
  onClick={actions.claimLocalDataForCurrentUser}
  disabled={!user || busy || !syncMeta?.accountSwitchBlocked}
>
  현재 로컬 데이터를 이 계정에 연결
</button>
```

- [ ] **Step 9: Add runtime order and package script**

Modify `scripts/build.mjs` and `index.html` to load `src/core/account-boundary.js` before `src/core/sync-controller.js`.

Modify `package.json`:

```json
"test:account-boundary": "node scripts/test-account-boundary.mjs"
```

- [ ] **Step 10: Verify account boundary**

Run:

```bash
npm run test:account-boundary
npm run test:sync
npm run build
```

Expected: all PASS.

- [ ] **Step 11: Commit**

```bash
git add src/core/account-boundary.js scripts/test-account-boundary.mjs src/core/sync-controller.js src/pages/Backup.js scripts/build.mjs index.html package.json
git commit -m "Prevent cross-account automatic backups"
```

---

### Task 3: Backup Payload Validation And Schema Version

**Files:**
- Modify: `src/core/backup-service.js`
- Modify: `src/core/sync-controller.js`
- Modify: `scripts/test-sync.mjs`
- Modify: `scripts/test-data-model.mjs`
- Modify: `README.md`

- [ ] **Step 1: Add failing backup schema tests**

Update `scripts/test-sync.mjs`.

Add a mock store inspection helper to `createMockFirestore`:

```js
return {
  getStore() {
    return store;
  },
  collection() {
    ...
  },
  async runTransaction(handler) {
    ...
  },
};
```

Add tests:

```js
async function testBackupWritesSchemaVersionTwoPayload() {
  const firestore = createMockFirestore(null);
  const context = createMockContext({ firestore });
  await loadBrowserScript("src/core/data-model.js", context);
  await loadBrowserScript("src/core/backup-service.js", context);

  await context.window.BackupService.backupUserData(
    "user-1",
    {
      tasks: [{ id: "t1", name: "Task", categoryId: "c1", repeatType: "daily", priority: "medium" }],
      cats: [{ id: "c1", name: "Cat", color: "#123456", icon: "C" }],
      checks: { "t1_2026-05-07": "2026-05-07T00:00:00.000Z" },
    },
    {}
  );

  const store = firestore.getStore();
  assert.equal(store.schemaVersion, 2);
  assert.equal(store.data.tasks.length, 1);
}

async function testRestoreReadsLegacyPayload() {
  const firestore = createMockFirestore({
    version: 1,
    tasks: [{ id: "t1", name: "Legacy", categoryId: "c1", repeatType: "daily", priority: "medium" }],
    cats: [{ id: "c1", name: "Cat", color: "#123456", icon: "C" }],
    checks: { "t1_2026-05-07": "2026-05-07T00:00:00.000Z" },
  });
  const context = createMockContext({ firestore });
  await loadBrowserScript("src/core/data-model.js", context);
  await loadBrowserScript("src/core/backup-service.js", context);

  const restored = await context.window.BackupService.restoreUserData("user-1");
  assert.equal(restored.tasks[0].name, "Legacy");
}
```

Call both from `run()`.

Also update the existing `backup-service` tests in `scripts/test-sync.mjs` so every test that loads `src/core/backup-service.js` first loads `src/core/data-model.js`. After Task 3, `BackupService` depends on `window.AppDataModel`.

- [ ] **Step 2: Run failing sync tests**

Run: `npm run test:sync`

Expected: FAIL because `backup-service` still writes top-level `tasks/cats/checks`.

- [ ] **Step 3: Use `AppDataModel` in backup writes**

Modify `src/core/backup-service.js` in `backupUserData` before transaction:

```js
const normalizedPayload = window.AppDataModel.normalizeAppData(payload);
const backupDocument = window.AppDataModel.toBackupDocument(normalizedPayload);
```

Inside `tx.set`, write:

```js
tx.set(docRef, {
  ...backupDocument,
  updatedAtClient: now,
  updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
  version: nextVersion,
});
```

Return normalized payload:

```js
return {
  ...normalizedPayload,
  version: nextVersion,
  updatedAt: latest.updatedAt || latestKnown.updatedAt || null,
  updatedAtClient: latestKnown.updatedAtClient,
};
```

- [ ] **Step 4: Use `AppDataModel` in restore reads**

Modify `restoreUserData`:

```js
const payload = window.AppDataModel.extractBackupPayload(data);
return {
  ...payload,
  updatedAtClient: data.updatedAtClient || null,
  updatedAt: toIso(data.updatedAt),
  version: normalizeVersion(data.version) || DEFAULT_VERSION,
};
```

- [ ] **Step 5: Use the same parser for local imports**

Modify `parseImportedBackup` in `src/core/sync-controller.js`:

```js
function parseImportedBackup(raw) {
  try {
    return window.AppDataModel.extractBackupPayload(raw);
  } catch (error) {
    throw new Error(error.message || "백업 파일 형식이 올바르지 않습니다.");
  }
}
```

Modify `exportLocalData` to use the same schema:

```js
const exportedAt = new Date().toISOString();
const payload = {
  format: "task-checklist-local-backup",
  exportedAt,
  ...window.AppDataModel.toBackupDocument({ tasks, cats, checks }),
};
```

- [ ] **Step 6: Update README backup schema note**

Update `README.md` under backup/admin setup:

```md
백업 문서는 `schemaVersion: 2`, `data.tasks`, `data.cats`, `data.checks`,
`version`, `updatedAtClient`, `updatedAt` 필드를 사용합니다.
기존 top-level `tasks/cats/checks` 백업은 읽기 호환만 유지합니다.
```

- [ ] **Step 7: Verify schema tests**

Run:

```bash
npm run test:data-model
npm run test:sync
npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/core/backup-service.js src/core/sync-controller.js scripts/test-sync.mjs scripts/test-data-model.mjs README.md
git commit -m "Validate backup payload schema"
```

---

### Task 4: Deletion Consistency And Import Normalization

**Files:**
- Modify: `src/App.js`
- Modify: `src/pages/Manage.js`
- Modify: `src/core/data-model.js`
- Modify: `scripts/test-data-model.mjs`

- [ ] **Step 1: Add failing data consistency tests**

Extend `scripts/test-data-model.mjs`.

```js
const appData = {
  tasks: [
    { id: "t1", name: "A", categoryId: "c1", repeatType: "daily", priority: "medium" },
    { id: "t2", name: "B", categoryId: "c2", repeatType: "weekly", repeatDay: 1, priority: "low" },
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

const taskDeleted = model.deleteTaskFromAppData(appData, "t1");
assert.equal(taskDeleted.tasks.some((task) => task.id === "t1"), false);
assert.equal(taskDeleted.checks["t1_2026-05-07"], undefined);
assert.equal(taskDeleted.checks["t2_2026-05-07"], "2026-05-07T00:00:00.000Z");

assert.equal(model.canDeleteCategory(appData, "c1").ok, false);
assert.equal(model.canDeleteCategory(appData, "unused").ok, true);
```

- [ ] **Step 2: Run failing data model tests**

Run: `npm run test:data-model`

Expected: FAIL because `canDeleteCategory` is missing or because cleanup behavior is incomplete.

- [ ] **Step 3: Add category deletion helper**

Modify `src/core/data-model.js`:

```js
function canDeleteCategory(appData, categoryId) {
  const usage = getCategoryUsage(appData, categoryId);
  if (usage > 0) {
    return {
      ok: false,
      usage,
      message: `이 카테고리를 사용하는 업무가 ${usage}개 있습니다.`,
    };
  }
  return { ok: true, usage: 0, message: "" };
}
```

Export it:

```js
canDeleteCategory,
```

- [ ] **Step 4: Pass checks into Manage**

Modify `src/App.js`:

```jsx
{page === "manage" && (
  <Manage
    tasks={tasks}
    setTasks={setTasks}
    cats={cats}
    setCats={setCats}
    checks={checks}
    setChecks={setChecks}
  />
)}
```

- [ ] **Step 5: Apply task deletion cleanup in Manage**

Modify `src/pages/Manage.js` signature:

```js
function Manage({ tasks, setTasks, cats, setCats, checks, setChecks }) {
```

Replace `delTask`:

```js
const delTask = (id) => {
  const nextData = window.AppDataModel.deleteTaskFromAppData({ tasks, cats, checks }, id);
  setTasks(nextData.tasks);
  setChecks(nextData.checks);
  if (editing === id) {
    setShowForm(false);
  }
};
```

- [ ] **Step 6: Block category deletion while in use**

Replace `delCat`:

```js
const delCat = (id) => {
  if (DEFAULT_CATEGORIES.find((c) => c.id === id)) {
    return;
  }
  const result = window.AppDataModel.canDeleteCategory({ tasks, cats, checks }, id);
  if (!result.ok) {
    window.alert(`${result.message} 먼저 업무의 카테고리를 변경해 주세요.`);
    return;
  }
  setCats((p) => p.filter((c) => c.id !== id));
};
```

- [ ] **Step 7: Normalize saved task values**

Inside `saveTask`, before `setTasks`, create a normalized one-task payload:

```js
const normalized = window.AppDataModel.normalizeAppData({
  tasks: [{ ...form, id: editing || uid() }],
  cats,
  checks: {},
});
const nextTask = normalized.tasks[0];
if (!nextTask) {
  return;
}
```

Use `nextTask` for update/insert.

- [ ] **Step 8: Verify consistency behavior**

Run:

```bash
npm run test:data-model
npm run test:sync
npm run build
```

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/App.js src/pages/Manage.js src/core/data-model.js scripts/test-data-model.mjs
git commit -m "Maintain task category and check consistency"
```

---

### Task 5: Monthly Schedule Rule Clarification

**Files:**
- Modify: `src/core/utils.js`
- Create: `scripts/test-schedule-rules.mjs`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write failing schedule tests**

Create `scripts/test-schedule-rules.mjs`.

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

async function loadUtils() {
  const context = { window: {} };
  context.window.window = context.window;
  vm.createContext(context);
  vm.runInContext(await readFile("src/core/utils.js", "utf8"), context, {
    filename: "src/core/utils.js",
  });
  return context.window.AppUtils;
}

async function run() {
  const utils = await loadUtils();
  const monthly = { id: "m1", repeatType: "monthly", repeatWeek: 1 };
  const weekly = { id: "w1", repeatType: "weekly", repeatDay: 2 };
  const daily = { id: "d1", repeatType: "daily" };

  assert.equal(utils.fmtDate(utils.getFirstWorkdayOfMonthWeek(2026, 4, 1)), "2026-05-01");
  assert.equal(utils.shouldShow(monthly, new Date(2026, 4, 1)), true);
  assert.equal(utils.shouldShow(monthly, new Date(2026, 4, 4)), false);

  assert.equal(utils.fmtDate(utils.getFirstWorkdayOfMonthWeek(2026, 7, 1)), "2026-08-03");
  assert.equal(utils.shouldShow({ id: "m2", repeatType: "monthly", repeatWeek: 1 }, new Date(2026, 7, 3)), true);

  assert.equal(utils.shouldShow(weekly, new Date(2026, 4, 6)), true);
  assert.equal(utils.shouldShow(daily, new Date(2026, 4, 6)), true);
  assert.equal(utils.shouldShow(daily, new Date(2026, 4, 9)), false);

  process.stdout.write("Schedule rule tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run failing schedule tests**

Run: `node scripts/test-schedule-rules.mjs`

Expected: FAIL because `shouldShow(monthly, 2026-05-04)` currently returns true for the same 1~7 bucket.

- [ ] **Step 3: Update monthly `shouldShow`**

Modify `src/core/utils.js`.

```js
function isSameDate(a, b) {
  return a && b && fmtDate(a) === fmtDate(b);
}
```

Update monthly branch:

```js
if (task.repeatType === "monthly") {
  const anchor = getFirstWorkdayOfMonthWeek(date.getFullYear(), date.getMonth(), task.repeatWeek);
  return isSameDate(anchor, date);
}
```

Export `isSameDate` only if tests need it. Prefer keeping it private unless another file needs it.

- [ ] **Step 4: Add package script**

Modify `package.json`:

```json
"test:schedule": "node scripts/test-schedule-rules.mjs"
```

- [ ] **Step 5: Update README schedule semantics**

Add a short note under the backup or usage section:

```md
월간 업무의 `N주차`는 매월 1~7일, 8~14일, 15~21일, 22~28일, 29일~말일 구간을 의미합니다.
해당 구간의 첫 근무일에 한 번 표시됩니다.
```

- [ ] **Step 6: Verify schedule tests and existing views**

Run:

```bash
npm run test:schedule
npm run test:data-model
npm run test:sync
npm run build
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/utils.js scripts/test-schedule-rules.mjs package.json README.md
git commit -m "Clarify monthly schedule rules"
```

---

### Task 6: CI, Documentation, And Final Verification

**Files:**
- Modify: `.github/workflows/deploy-firebase-hosting.yml`
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add aggregate verification script**

Modify `package.json`:

```json
"test": "npm run test:data-model && npm run test:account-boundary && npm run test:schedule && npm run test:env-file && npm run test:build-mode && npm run test:firebase-config && npm run test:preview-script && npm run test:sync"
```

- [ ] **Step 2: Use aggregate test in CI**

Modify `.github/workflows/deploy-firebase-hosting.yml`.

Replace individual test steps with:

```yaml
- name: Verify project tests
  run: npm test
```

Keep `Prepare deployment artifact` and `Deploy to Firebase Hosting` unchanged.

- [ ] **Step 3: Update README developer flow**

Change the setup verification block to:

```bash
npm test
npm run build
```

Document:

- 계정 전환 시 자동 백업이 잠기며 사용자가 서버 복원 또는 로컬 데이터 연결을 선택해야 합니다.
- 백업 문서는 `schemaVersion: 2`를 사용하며 legacy top-level payload는 읽기만 지원합니다.
- 카테고리 삭제는 사용 중인 업무가 있으면 차단됩니다.
- 월간 업무는 해당 주차 구간의 첫 근무일에 표시됩니다.

- [ ] **Step 4: Run full local verification**

Run:

```bash
npm test
npm run build
```

Expected:

- `Data model tests passed`
- `Account boundary tests passed`
- `Schedule rule tests passed`
- existing env/build/firebase/preview/sync tests all PASS
- `Built ... files into ./build`

- [ ] **Step 5: Run strict hosting build with real or sample env**

If real `.env.local` exists:

```bash
npm run build:hosting
```

If no real env exists:

```bash
TASK_CHECKLIST_ENV_FILES=.env.example npm run build:hosting
```

Expected: PASS with `Prepared ./dist for deployment`.

- [ ] **Step 6: Inspect git diff**

Run:

```bash
git diff --stat
git diff -- src/core/sync-controller.js src/core/backup-service.js src/pages/Manage.js src/core/utils.js
```

Expected: changes are limited to the planned files and generated build artifacts remain untracked.

- [ ] **Step 7: Commit final CI/docs changes**

```bash
git add package.json README.md .github/workflows/deploy-firebase-hosting.yml
git commit -m "Document data boundary verification"
```

---

## Final Acceptance Criteria

- 계정이 바뀌면 자동 백업이 실행되지 않습니다.
- 계정 전환 상태에서는 사용자가 서버 복원 또는 로컬 데이터 연결을 명시적으로 선택해야 합니다.
- 백업 저장은 `schemaVersion: 2`와 normalized `data` payload를 사용합니다.
- legacy top-level `tasks/cats/checks` 백업은 복원할 수 있습니다.
- 업무 삭제 시 관련 `checks`가 제거됩니다.
- 사용 중인 카테고리는 삭제할 수 없습니다.
- import/restore 후 고아 체크, 빈 업무, 없는 카테고리 참조가 남지 않습니다.
- 월간 업무는 지정 주차 구간의 첫 근무일에 한 번만 표시됩니다.
- `npm test`, `npm run build`, `npm run build:hosting`이 통과합니다.

## Execution Notes

- 각 Task는 독립 커밋으로 마무리합니다.
- Task 2는 실제 사용자 데이터 보호와 직결되므로 가장 먼저 리뷰합니다.
- Task 3의 Firestore 문서 shape 변경은 읽기 호환을 유지해야 합니다.
- Task 5는 사용자 체감이 바뀌는 동작 변경이므로 README 문구를 반드시 같이 업데이트합니다.
