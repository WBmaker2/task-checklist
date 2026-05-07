import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

function makeSnapshot(data) {
  return {
    exists: Boolean(data),
    data() {
      return data ? { ...data } : {};
    },
  };
}

function createMockFirestore(initialData, options = {}) {
  let store = initialData ? { ...initialData } : null;
  const queuedMetaSnapshots = [...(options.metaSnapshots || [])];

  const docRef = {
    async get() {
      if (queuedMetaSnapshots.length > 0) {
        return makeSnapshot(queuedMetaSnapshots.shift());
      }
      return makeSnapshot(store);
    },
  };

  return {
    collection() {
      return {
        doc() {
          return docRef;
        },
      };
    },
    getStore() {
      return store ? { ...store } : null;
    },
    async runTransaction(handler) {
      let pendingWrite = null;
      const tx = {
        async get() {
          return makeSnapshot(store);
        },
        set(_ref, value) {
          pendingWrite = { ...value };
        },
      };

      await handler(tx);
      if (pendingWrite) {
        store = {
          ...pendingWrite,
          updatedAt:
            pendingWrite.updatedAt === "__server_timestamp__"
              ? options.serverUpdatedAt || "2026-03-16T12:00:00.000Z"
              : pendingWrite.updatedAt,
        };
      }
    },
  };
}

function createMockContext({ firestore }) {
  const firebase = {
    apps: [],
    initializeApp() {
      firebase.apps.push({ name: "mock-app" });
      return firebase.apps[0];
    },
    app() {
      return firebase.apps[0];
    },
    auth() {
      return {
        currentUser: null,
        useDeviceLanguage() {},
        getRedirectResult: async () => ({ user: null }),
        onAuthStateChanged() {
          return () => {};
        },
        signInWithRedirect: async () => {},
        signOut: async () => {},
      };
    },
    firestore() {
      return firestore;
    },
  };
  firebase.firestore.FieldValue = {
    serverTimestamp() {
      return "__server_timestamp__";
    },
  };

  const sessionStorage = new Map();
  const context = {
    console,
    Date,
    Promise,
    window: {
      firebase,
      FIREBASE_CONFIG: {
        apiKey: "test-api-key",
        authDomain: "test.example.com",
        projectId: "test-project",
        appId: "test-app-id",
        storageBucket: "",
        messagingSenderId: "",
      },
      sessionStorage: {
        getItem(key) {
          return sessionStorage.has(key) ? sessionStorage.get(key) : null;
        },
        setItem(key, value) {
          sessionStorage.set(key, String(value));
        },
        removeItem(key) {
          sessionStorage.delete(key);
        },
      },
      setTimeout,
      clearTimeout,
    },
  };
  context.window.window = context.window;
  return context;
}

function createFakeSyncControllerContext({ syncMeta } = {}) {
  const window = {
    AppUtils: {
      load(key) {
        if (key === "cc_sync_meta_v1") {
          return syncMeta || null;
        }
        return null;
      },
      save() {},
    },
    AppSyncState: null,
    sessionStorage: new Map(),
    confirm() {
      return true;
    },
    BackupService: {
      ensureInitialized() {
        return { ok: true };
      },
      awaitAuthBootstrap: async () => null,
      getCurrentUser: async () => null,
      onAuthStateChanged: () => () => {},
      fetchBackupMeta: async () => ({ exists: false }),
      restoreUserData: async () => null,
      backupUserData: async () => ({ updatedAt: new Date().toISOString() }),
      signInWithGoogle: async () => ({}),
      signOut: async () => ({}),
      subscribeBackupChanges: () => () => {},
    },
  };

  const context = {
    console,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    window: {
      ...window,
      sessionStorage: {
        getItem(key) {
          return window.sessionStorage.has(key) ? window.sessionStorage.get(key) : null;
        },
        setItem(key, value) {
          window.sessionStorage.set(key, String(value));
        },
        removeItem(key) {
          window.sessionStorage.delete(key);
        },
      },
    },
  };

  context.window.window = context.window;

  context.React = {
    useState(initialValue) {
      const value = typeof initialValue === "function" ? initialValue() : initialValue;
      return [value, () => {}];
    },
    useEffect() {},
    useRef(initialValue) {
      return { current: initialValue };
    },
    useCallback(fn) {
      return fn;
    },
    useMemo(factory) {
      return typeof factory === "function" ? factory() : factory;
    },
  };

  context.window.AppSyncState = {
    toVersion(value) {
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    },
    isServerAhead() {
      return false;
    },
    resolveNextBaseVersion() {
      return null;
    },
  };

  vm.createContext(context);
  return context;
}

async function loadBrowserScript(filePath, context) {
  const source = await readFile(filePath, "utf8");
  vm.createContext(context);
  vm.runInContext(source, context, { filename: filePath });
}

async function loadBackupService(context) {
  await loadBrowserScript("src/core/data-model.js", context);
  await loadBrowserScript("src/core/backup-service.js", context);
}

async function testBackupUsesTransactionVersion() {
  const firestore = createMockFirestore(
    {
      version: 4,
      updatedAt: "2026-03-16T10:00:00.000Z",
      updatedAtClient: "2026-03-16T10:00:00.000Z",
    },
    {
      metaSnapshots: [
        {
          version: 4,
          updatedAt: "2026-03-16T10:00:00.000Z",
          updatedAtClient: "2026-03-16T10:00:00.000Z",
        },
      ],
    }
  );
  const context = createMockContext({ firestore });
  await loadBackupService(context);

  const result = await context.window.BackupService.backupUserData(
    "user-1",
    { tasks: [], cats: [], checks: {} },
    { baseVersion: 4 }
  );

  assert.equal(result.version, 5);
  assert.equal(result.updatedAtClient !== null, true);
}

async function testBackupConflictStillBlocksOldBaseVersion() {
  const firestore = createMockFirestore({
    version: 9,
    updatedAt: "2026-03-16T10:00:00.000Z",
    updatedAtClient: "2026-03-16T10:00:00.000Z",
  });
  const context = createMockContext({ firestore });
  await loadBackupService(context);

  await assert.rejects(
    () =>
      context.window.BackupService.backupUserData(
        "user-1",
        { tasks: [], cats: [], checks: {} },
        { baseVersion: 8 }
      ),
    (error) => {
      assert.equal(error.code, "backup-conflict");
      assert.equal(error.meta?.serverVersion, 9);
      return true;
    }
  );
}

async function testBackupWritesSchemaVersionTwoPayload() {
  const firestore = createMockFirestore(null);
  const context = createMockContext({ firestore });
  await loadBackupService(context);

  await context.window.BackupService.backupUserData(
    "user-1",
    {
      tasks: [
        {
          id: "task-1",
          name: "국어 수업",
          categoryId: "cat-a",
          repeatType: "weekly",
          repeatDay: 2,
          repeatWeek: 1,
          priority: "high",
          memo: "  발표 준비  ",
        },
      ],
      cats: [
        {
          id: "cat-a",
          name: "수업",
          color: "#1d4ed8",
          icon: "📝",
        },
      ],
      checks: {
        "task-1_2026-05-07": "2026-05-07T00:00:00.000Z",
      },
    },
    {}
  );

  const store = firestore.getStore();
  assert.equal(store.schemaVersion, 2);
  assert.equal(Array.isArray(store.data.tasks), true);
  assert.equal(store.data.tasks.length, 1);
  assert.equal(store.data.cats.length, 1);
  assert.equal(store.data.tasks[0].id, "task-1");
  assert.equal(store.data.tasks[0].name, "국어 수업");
  assert.equal(store.data.tasks[0].categoryId, "cat-a");
  assert.equal(store.data.checks["task-1_2026-05-07"], "2026-05-07T00:00:00.000Z");
}

async function testRestoreReadsLegacyPayload() {
  const firestore = createMockFirestore({
    version: 3,
    updatedAt: "2026-03-16T09:00:00.000Z",
    updatedAtClient: "2026-03-16T09:00:00.000Z",
    tasks: [
      {
        id: "legacy-task",
        name: "Legacy",
        categoryId: "legacy-cat",
        repeatType: "daily",
        repeatDay: 0,
        repeatWeek: 1,
        priority: "medium",
      },
    ],
    cats: [
      {
        id: "legacy-cat",
        name: "기본",
        color: "#94a3b8",
        icon: "📌",
      },
    ],
    checks: {
      "legacy-task_2026-03-16": "2026-03-16T09:00:00.000Z",
    },
  });
  const context = createMockContext({ firestore });
  await loadBackupService(context);

  const restored = await context.window.BackupService.restoreUserData("user-1");
  assert.equal(restored.version, 3);
  assert.equal(restored.tasks.length, 1);
  assert.equal(restored.tasks[0].name, "Legacy");
  assert.equal(restored.cats[0].id, "legacy-cat");
  assert.equal(restored.checks["legacy-task_2026-03-16"], "2026-03-16T09:00:00.000Z");
}

async function testSyncHelpersPreferFreshResultVersion() {
  const context = { window: {} };
  await loadBrowserScript("src/core/sync-state.js", context);

  const { resolveNextBaseVersion, isServerAhead } = context.window.AppSyncState;
  assert.equal(resolveNextBaseVersion(5, 4, 4), 5);
  assert.equal(resolveNextBaseVersion(null, 4, 3), 4);
  assert.equal(isServerAhead({ exists: true, version: 6 }, { baseVersion: 5 }), true);
  assert.equal(isServerAhead({ exists: true, version: 5 }, { baseVersion: 5 }), false);
}

async function testSyncControllerInitializationGuard() {
  const context = createFakeSyncControllerContext();
  await loadBrowserScript("src/core/sync-state.js", context);
  await loadBrowserScript("src/core/account-boundary.js", context);
  await loadBrowserScript("src/core/sync-controller.js", context);

  const controller = context.window.AppSyncController;
  assert.equal(typeof controller.useSyncController, "function");

  const result = controller.useSyncController({
    tasks: [],
    cats: [],
    checks: {},
    setTasks() {},
    setCats() {},
    setChecks() {},
    theme: {
      bg: "#fff",
      surface: "#fff",
      surfaceAlt: "#eee",
      text: "#111",
      textMuted: "#777",
      border: "#ddd",
      accent: "#0f766e",
      shadow: "none",
    },
  });

  assert.equal(typeof result.backupActions.claimLocalDataForCurrentUser, "function");
}

async function testLegacySyncMetaInitializationBlocksBackupPath() {
  const legacyMeta = {
    ownerUserId: "user-legacy",
    dirty: true,
    baseVersion: 7,
  };

  const context = createFakeSyncControllerContext({ syncMeta: legacyMeta });
  await loadBrowserScript("src/core/sync-state.js", context);
  await loadBrowserScript("src/core/account-boundary.js", context);
  await loadBrowserScript("src/core/sync-controller.js", context);

  const controller = context.window.AppSyncController;
  assert.equal(typeof controller.__test?.normalizeSyncMeta, "function");

  const normalized = controller.__test.normalizeSyncMeta(legacyMeta);
  assert.equal(normalized.accountSwitchBlocked, true);
  assert.equal(normalized.blockedPreviousOwnerUserId, "user-legacy");

  const syncController = controller.useSyncController({
    tasks: [],
    cats: [{ id: "cat-a", name: "기본", color: "#94a3b8", icon: "📌" }],
    checks: {},
    setTasks() {},
    setCats() {},
    setChecks() {},
    theme: {
      bg: "#fff",
      surface: "#fff",
      surfaceAlt: "#eee",
      text: "#111",
      textMuted: "#777",
      border: "#ddd",
      accent: "#0f766e",
      shadow: "none",
    },
  });

  assert.equal(syncController.syncMeta.accountSwitchBlocked, true);
  assert.equal(
    context.window.AppAccountBoundary.canScheduleAutoBackup({
      serviceOk: true,
      userId: "user-legacy",
      ownerUserId: "user-legacy",
      dirty: true,
      serverAhead: false,
      busy: false,
      accountSwitchBlocked: syncController.syncMeta.accountSwitchBlocked,
    }),
    false
  );
}

async function testImportLocalDataRejectsMalformedPayload() {
  const invalidPayloads = [
    { data: { foo: "bar" } },
    {},
    123,
    {
      data: {
        tasks: [{ id: "bad" }],
        cats: [{ id: "cat-a", name: "수업" }],
        checks: {},
      },
    },
    {
      data: {
        tasks: [{ id: "t1", name: "업무1" }],
        cats: [{ id: "cat-a" }],
        checks: {},
      },
    },
    {
      data: {
        tasks: [{ id: "t1", name: "업무1" }],
        cats: [{ id: "cat-a", name: "수업" }],
        checks: { "unknown-task_2026-05-07": "2026-05-07" },
      },
    },
  ];

  for (const payload of invalidPayloads) {
    const context = createFakeSyncControllerContext();
    context.window.confirmCalls = 0;
    context.window.confirm = () => {
      context.window.confirmCalls += 1;
      return true;
    };

    await loadBrowserScript("src/core/data-model.js", context);
    await loadBrowserScript("src/core/sync-state.js", context);
    await loadBrowserScript("src/core/account-boundary.js", context);
    await loadBrowserScript("src/core/sync-controller.js", context);

    let taskSetCount = 0;
    let catSetCount = 0;
    let checkSetCount = 0;

    const controller = context.window.AppSyncController.useSyncController({
      tasks: [{ id: "local-task", name: "로컬", categoryId: "cat-1", repeatType: "weekly", repeatDay: 0, repeatWeek: 1, priority: "medium" }],
      cats: [{ id: "cat-1", name: "카테고리", color: "#1d4ed8", icon: "📝" }],
      checks: {},
      setTasks() {
        taskSetCount += 1;
      },
      setCats() {
        catSetCount += 1;
      },
      setChecks() {
        checkSetCount += 1;
      },
      theme: {
        bg: "#fff",
        surface: "#fff",
        surfaceAlt: "#eee",
        text: "#111",
        textMuted: "#777",
        border: "#ddd",
        accent: "#0f766e",
        shadow: "none",
      },
    });

    await controller.backupActions.importLocalData({
      async text() {
        return JSON.stringify(payload);
      },
    });

    assert.equal(taskSetCount, 0);
    assert.equal(catSetCount, 0);
    assert.equal(checkSetCount, 0);
    assert.equal(context.window.confirmCalls, 0);
  }
}

async function testImportLocalDataAcceptsValidChecks() {
  const payload = {
    data: {
      tasks: [
        {
          id: "task-1",
          name: "업무1",
          categoryId: "cat-a",
          repeatType: "weekly",
          repeatDay: 1,
          repeatWeek: 1,
          priority: "medium",
        },
      ],
      cats: [{ id: "cat-a", name: "수업" }],
      checks: { "task-1_2026-05-07": "2026-05-07T00:00:00.000Z" },
    },
  };

  const context = createFakeSyncControllerContext();
  context.window.confirmCalls = 0;
  context.window.confirm = () => {
    context.window.confirmCalls += 1;
    return true;
  };

  await loadBrowserScript("src/core/data-model.js", context);
  await loadBrowserScript("src/core/sync-state.js", context);
  await loadBrowserScript("src/core/account-boundary.js", context);
  await loadBrowserScript("src/core/sync-controller.js", context);

  let taskSetCount = 0;
  let catSetCount = 0;
  let checkSetCount = 0;

  const controller = context.window.AppSyncController.useSyncController({
    tasks: [],
    cats: [{ id: "cat-a", name: "카테고리", color: "#1d4ed8", icon: "📝" }],
    checks: {},
    setTasks() {
      taskSetCount += 1;
    },
    setCats() {
      catSetCount += 1;
    },
    setChecks() {
      checkSetCount += 1;
    },
    theme: {
      bg: "#fff",
      surface: "#fff",
      surfaceAlt: "#eee",
      text: "#111",
      textMuted: "#777",
      border: "#ddd",
      accent: "#0f766e",
      shadow: "none",
    },
  });

  await controller.backupActions.importLocalData({
    async text() {
      return JSON.stringify(payload);
    },
  });

  assert.equal(taskSetCount, 1);
  assert.equal(catSetCount, 1);
  assert.equal(checkSetCount, 1);
  assert.equal(context.window.confirmCalls, 1);
}

async function run() {
  await testBackupUsesTransactionVersion();
  await testBackupConflictStillBlocksOldBaseVersion();
  await testSyncHelpersPreferFreshResultVersion();
  await testSyncControllerInitializationGuard();
  await testLegacySyncMetaInitializationBlocksBackupPath();
  await testImportLocalDataRejectsMalformedPayload();
  await testImportLocalDataAcceptsValidChecks();
  await testBackupWritesSchemaVersionTwoPayload();
  await testRestoreReadsLegacyPayload();
  process.stdout.write("Sync smoke tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
