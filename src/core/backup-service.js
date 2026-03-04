(function () {
  const CONFIG_KEY = "cc_firebase_config_v1";
  const COLLECTION = "checklistBackups";

  let initialized = false;
  let auth = null;
  let db = null;
  let provider = null;

  function sanitizeConfig(config) {
    const c = config || {};
    return {
      apiKey: (c.apiKey || "").trim(),
      authDomain: (c.authDomain || "").trim(),
      projectId: (c.projectId || "").trim(),
      storageBucket: (c.storageBucket || "").trim(),
      messagingSenderId: (c.messagingSenderId || "").trim(),
      appId: (c.appId || "").trim(),
    };
  }

  function getConfig() {
    const saved = window.AppUtils.load(CONFIG_KEY, null);
    if (saved && typeof saved === "object") {
      return sanitizeConfig(saved);
    }
    return sanitizeConfig(window.FIREBASE_CONFIG);
  }

  function setConfig(nextConfig) {
    const config = sanitizeConfig(nextConfig);
    window.AppUtils.save(CONFIG_KEY, config);
    return config;
  }

  async function reinitialize(nextConfig) {
    const firebaseObj = window.firebase;
    setConfig(nextConfig);

    if (firebaseObj && firebaseObj.apps && firebaseObj.apps.length) {
      await Promise.all(
        firebaseObj.apps.map((app) =>
          app.delete().catch(() => {
            // ignore app deletion failures
          })
        )
      );
    }

    initialized = false;
    auth = null;
    db = null;
    provider = null;

    return ensureInitialized();
  }

  function hasRequiredConfig(config) {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  function ensureInitialized() {
    const firebaseObj = window.firebase;
    if (!firebaseObj) {
      return { ok: false, code: "firebase-sdk-missing", message: "Firebase SDK를 불러오지 못했습니다." };
    }

    const config = getConfig();
    if (!hasRequiredConfig(config)) {
      return { ok: false, code: "missing-config", message: "Firebase 설정값이 필요합니다." };
    }

    if (initialized) {
      return { ok: true, auth, db, provider, config };
    }

    try {
      if (!firebaseObj.apps.length) {
        firebaseObj.initializeApp(config);
      }
      auth = firebaseObj.auth();
      db = firebaseObj.firestore();
      provider = new firebaseObj.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      initialized = true;
      return { ok: true, auth, db, provider, config };
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

  function getCurrentUser() {
    const state = ensureInitialized();
    if (!state.ok) {
      return null;
    }
    return state.auth.currentUser;
  }

  function onAuthStateChanged(callback) {
    const state = ensureInitialized();
    if (!state.ok) {
      callback(null);
      return () => {};
    }
    return state.auth.onAuthStateChanged(callback);
  }

  async function signInWithGoogle() {
    const state = assertReady();
    const result = await state.auth.signInWithPopup(state.provider);
    return result.user;
  }

  async function signOut() {
    const state = assertReady();
    await state.auth.signOut();
  }

  function userDoc(userId) {
    return db.collection(COLLECTION).doc(userId);
  }

  async function backupUserData(userId, payload) {
    const state = assertReady();
    const safePayload = {
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      cats: Array.isArray(payload.cats) ? payload.cats : [],
      checks: payload.checks && typeof payload.checks === "object" ? payload.checks : {},
      updatedAtClient: new Date().toISOString(),
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      version: 2,
    };

    await userDoc(userId).set(safePayload, { merge: true });
    return safePayload;
  }

  async function restoreUserData(userId) {
    assertReady();
    const snap = await userDoc(userId).get();
    if (!snap.exists) {
      return null;
    }

    const raw = snap.data() || {};
    return {
      tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
      cats: Array.isArray(raw.cats) ? raw.cats : [],
      checks: raw.checks && typeof raw.checks === "object" ? raw.checks : {},
      updatedAtClient: raw.updatedAtClient || null,
      updatedAt: raw.updatedAt && raw.updatedAt.toDate ? raw.updatedAt.toDate().toISOString() : null,
      version: raw.version || 1,
    };
  }

  async function fetchBackupMeta(userId) {
    assertReady();
    const snap = await userDoc(userId).get();
    if (!snap.exists) {
      return { exists: false, updatedAtClient: null, updatedAt: null };
    }
    const raw = snap.data() || {};
    return {
      exists: true,
      updatedAtClient: raw.updatedAtClient || null,
      updatedAt: raw.updatedAt && raw.updatedAt.toDate ? raw.updatedAt.toDate().toISOString() : null,
    };
  }

  window.BackupService = {
    getConfig,
    setConfig,
    reinitialize,
    hasRequiredConfig,
    ensureInitialized,
    getCurrentUser,
    onAuthStateChanged,
    signInWithGoogle,
    signOut,
    backupUserData,
    restoreUserData,
    fetchBackupMeta,
  };
})();
