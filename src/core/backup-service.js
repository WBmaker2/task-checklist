(function () {
  const BACKUP_COLLECTION = "userBackups";
  const DEFAULT_VERSION = 1;
  const AUTH_REDIRECT_PENDING_KEY = "cc_auth_redirect_pending";

  let initialized = false;
  let app = null;
  let auth = null;
  let db = null;
  let authBootstrapPromise = null;
  let authBootstrapResult = null;

  function sanitizeConfig(config) {
    const c = config || {};
    return {
      apiKey: (c.apiKey || "").trim(),
      authDomain: (c.authDomain || "").trim(),
      projectId: (c.projectId || "").trim(),
      appId: (c.appId || "").trim(),
      storageBucket: (c.storageBucket || "").trim(),
      messagingSenderId: (c.messagingSenderId || "").trim(),
    };
  }

  function getConfig() {
    return sanitizeConfig(window.FIREBASE_CONFIG || {});
  }

  function hasRequiredConfig(config) {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  function ensureInitialized() {
    const sdk = window.firebase;
    if (!sdk || typeof sdk.initializeApp !== "function") {
      return { ok: false, code: "firebase-sdk-missing", message: "Firebase SDK를 불러오지 못했습니다." };
    }

    const config = getConfig();
    if (!hasRequiredConfig(config)) {
      return {
        ok: false,
        code: "missing-config",
        message: "백업 기능이 아직 활성화되지 않았습니다. 관리자에게 Firebase 설정을 요청해 주세요.",
      };
    }

    if (initialized && app && auth && db) {
      return { ok: true, app, auth, db, config };
    }

    try {
      app = sdk.apps && sdk.apps.length > 0 ? sdk.app() : sdk.initializeApp(config);
      auth = sdk.auth();
      db = sdk.firestore();
      if (typeof auth.useDeviceLanguage === "function") {
        auth.useDeviceLanguage();
      }
      initialized = true;
      startAuthBootstrap({ ok: true, app, auth, db, config });
      return { ok: true, app, auth, db, config };
    } catch (error) {
      return { ok: false, code: "init-failed", message: error?.message || "초기화 실패" };
    }
  }

  function assertReady() {
    const state = ensureInitialized();
    if (!state.ok) {
      throw new Error(state.message || "백업 서비스를 초기화할 수 없습니다.");
    }
    return state;
  }

  function normalizeVersion(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }

  function toIso(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }

    return null;
  }

  function normalizeUser(user) {
    if (!user) {
      return null;
    }

    return {
      id: user.uid,
      email: user.email || null,
      user_metadata: {
        full_name: user.displayName || "",
      },
      rawUser: user,
    };
  }

  function getDocRef(database, userId) {
    return database.collection(BACKUP_COLLECTION).doc(userId);
  }

  function canUseSessionStorage() {
    try {
      return typeof window.sessionStorage !== "undefined";
    } catch (error) {
      return false;
    }
  }

  function setRedirectPending(value) {
    if (!canUseSessionStorage()) {
      return;
    }

    if (value) {
      window.sessionStorage.setItem(AUTH_REDIRECT_PENDING_KEY, "1");
      return;
    }

    window.sessionStorage.removeItem(AUTH_REDIRECT_PENDING_KEY);
  }

  function isRedirectPending() {
    if (!canUseSessionStorage()) {
      return false;
    }
    return window.sessionStorage.getItem(AUTH_REDIRECT_PENDING_KEY) === "1";
  }

  function toAuthMessage(level, message) {
    return message ? { level, message } : null;
  }

  function startAuthBootstrap(state) {
    if (authBootstrapResult) {
      return Promise.resolve(authBootstrapResult);
    }

    if (authBootstrapPromise) {
      return authBootstrapPromise;
    }

    const hadPendingRedirect = isRedirectPending();

    authBootstrapPromise = state.auth
      .getRedirectResult()
      .then((result) => {
        const user = normalizeUser(result?.user || state.auth.currentUser);
        let feedback = null;
        if (hadPendingRedirect && user) {
          feedback = toAuthMessage("success", "Google 로그인되었습니다.");
        } else if (hadPendingRedirect) {
          feedback = toAuthMessage("warn", "로그인이 완료되지 않았습니다. 다시 시도해 주세요.");
        }

        authBootstrapResult = { user, feedback };
        setRedirectPending(false);
        return authBootstrapResult;
      })
      .catch((error) => {
        authBootstrapResult = {
          user: normalizeUser(state.auth.currentUser),
          feedback: toAuthMessage("error", `로그인 실패: ${error?.message || "알 수 없는 오류"}`),
        };
        setRedirectPending(false);
        return authBootstrapResult;
      });

    return authBootstrapPromise;
  }

  async function getCurrentUser() {
    const state = ensureInitialized();
    if (!state.ok) {
      return null;
    }

    return normalizeUser(state.auth.currentUser);
  }

  function onAuthStateChanged(callback) {
    const state = ensureInitialized();
    if (!state.ok) {
      callback(null, "SERVICE_UNAVAILABLE");
      return () => {};
    }

    return state.auth.onAuthStateChanged((user) => {
      callback(normalizeUser(user), user ? "SIGNED_IN" : "SIGNED_OUT");
    });
  }

  async function awaitAuthBootstrap() {
    const state = ensureInitialized();
    if (!state.ok) {
      return { user: null, feedback: null };
    }

    return startAuthBootstrap(state);
  }

  async function signInWithGoogle() {
    const state = assertReady();
    const provider = new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setRedirectPending(true);

    try {
      authBootstrapResult = null;
      authBootstrapPromise = null;
      await state.auth.signInWithRedirect(provider);
      return {
        redirecting: true,
        user: null,
      };
    } catch (error) {
      setRedirectPending(false);
      throw error;
    }
  }

  async function signOut() {
    const state = assertReady();
    await state.auth.signOut();
  }

  function conflictError(message, meta) {
    const error = new Error(message);
    error.code = "backup-conflict";
    error.meta = meta || {};
    return error;
  }

  async function fetchBackupMeta(userId) {
    const state = assertReady();
    const snapshot = await getDocRef(state.db, userId).get();

    if (!snapshot.exists) {
      return { exists: false, updatedAtClient: null, updatedAt: null, version: null };
    }

    const data = snapshot.data() || {};
    return {
      exists: true,
      updatedAtClient: data.updatedAtClient || null,
      updatedAt: toIso(data.updatedAt),
      version: normalizeVersion(data.version),
    };
  }

  async function backupUserData(userId, payload, options) {
    const state = assertReady();
    const opts = options || {};
    const force = Boolean(opts.force);
    const baseVersion = normalizeVersion(opts.baseVersion);
    const now = new Date().toISOString();
    const docRef = getDocRef(state.db, userId);

    let nextVersion = DEFAULT_VERSION;
    let latestKnown = { updatedAtClient: now, updatedAt: null };

    await state.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(docRef);
      const data = snapshot.exists ? (snapshot.data() || {}) : {};
      const currentVersion = normalizeVersion(data.version);

      if (snapshot.exists && !force) {
        if (!baseVersion || baseVersion !== currentVersion) {
          throw conflictError("서버에 더 최신 데이터가 있습니다. 복원 또는 강제 업로드를 선택해 주세요.", {
            serverVersion: currentVersion,
            serverUpdatedAt: toIso(data.updatedAt) || data.updatedAtClient || null,
          });
        }
      }

      nextVersion = snapshot.exists ? (currentVersion || DEFAULT_VERSION) + 1 : DEFAULT_VERSION;
      latestKnown = {
        updatedAtClient: now,
        updatedAt: toIso(data.updatedAt) || data.updatedAtClient || null,
      };

      tx.set(docRef, {
        tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
        cats: Array.isArray(payload.cats) ? payload.cats : [],
        checks: payload.checks && typeof payload.checks === "object" ? payload.checks : {},
        updatedAtClient: now,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        version: nextVersion,
      });
    });

    const latest = await fetchBackupMeta(userId);
    return {
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      cats: Array.isArray(payload.cats) ? payload.cats : [],
      checks: payload.checks && typeof payload.checks === "object" ? payload.checks : {},
      version: latest.version || nextVersion,
      updatedAt: latest.updatedAt || latestKnown.updatedAt || null,
      updatedAtClient: latest.updatedAtClient || latestKnown.updatedAtClient,
    };
  }

  async function restoreUserData(userId) {
    const state = assertReady();
    const snapshot = await getDocRef(state.db, userId).get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data() || {};
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      cats: Array.isArray(data.cats) ? data.cats : [],
      checks: data.checks && typeof data.checks === "object" ? data.checks : {},
      updatedAtClient: data.updatedAtClient || null,
      updatedAt: toIso(data.updatedAt),
      version: normalizeVersion(data.version) || DEFAULT_VERSION,
    };
  }

  function subscribeBackupChanges(userId, callback) {
    const state = ensureInitialized();
    if (!state.ok || !userId) {
      return () => {};
    }

    return getDocRef(state.db, userId).onSnapshot(
      (snapshot) => {
        callback({ exists: snapshot.exists });
      },
      (error) => {
        callback({ error });
      }
    );
  }

  window.BackupService = {
    getConfig,
    hasRequiredConfig,
    ensureInitialized,
    awaitAuthBootstrap,
    getCurrentUser,
    onAuthStateChanged,
    signInWithGoogle,
    signOut,
    backupUserData,
    restoreUserData,
    fetchBackupMeta,
    subscribeBackupChanges,
  };
})();
