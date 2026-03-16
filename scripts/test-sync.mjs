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

async function loadBrowserScript(filePath, context) {
  const source = await readFile(filePath, "utf8");
  vm.createContext(context);
  vm.runInContext(source, context, { filename: filePath });
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
  await loadBrowserScript("src/core/backup-service.js", context);

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
  await loadBrowserScript("src/core/backup-service.js", context);

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

async function testSyncHelpersPreferFreshResultVersion() {
  const context = { window: {} };
  await loadBrowserScript("src/core/sync-state.js", context);

  const { resolveNextBaseVersion, isServerAhead } = context.window.AppSyncState;
  assert.equal(resolveNextBaseVersion(5, 4, 4), 5);
  assert.equal(resolveNextBaseVersion(null, 4, 3), 4);
  assert.equal(isServerAhead({ exists: true, version: 6 }, { baseVersion: 5 }), true);
  assert.equal(isServerAhead({ exists: true, version: 5 }, { baseVersion: 5 }), false);
}

async function run() {
  await testBackupUsesTransactionVersion();
  await testBackupConflictStillBlocksOldBaseVersion();
  await testSyncHelpersPreferFreshResultVersion();
  process.stdout.write("Sync smoke tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
