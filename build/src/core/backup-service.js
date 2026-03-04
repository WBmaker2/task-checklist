(function() {
  const BACKUP_TABLE = "user_backups";
  const DEFAULT_VERSION = 1;
  let initialized = false;
  let client = null;
  function sanitizeConfig(config) {
    const c = config || {};
    return {
      url: (c.url || "").trim(),
      anonKey: (c.anonKey || "").trim(),
      redirectTo: (c.redirectTo || `${window.location.origin}${window.location.pathname}`).trim()
    };
  }
  function getConfig() {
    return sanitizeConfig(window.SUPABASE_CONFIG || {});
  }
  function hasRequiredConfig(config) {
    return Boolean(config.url && config.anonKey);
  }
  function ensureInitialized() {
    const sdk = window.supabase;
    if (!sdk || typeof sdk.createClient !== "function") {
      return { ok: false, code: "supabase-sdk-missing", message: "Supabase SDK를 불러오지 못했습니다." };
    }
    const config = getConfig();
    if (!hasRequiredConfig(config)) {
      return {
        ok: false,
        code: "missing-config",
        message: "백업 기능이 아직 활성화되지 않았습니다. 관리자에게 Supabase 설정을 요청해 주세요."
      };
    }
    if (initialized && client) {
      return { ok: true, client, config };
    }
    try {
      client = sdk.createClient(config.url, config.anonKey);
      initialized = true;
      return { ok: true, client, config };
    } catch (error) {
      return { ok: false, code: "init-failed", message: (error == null ? void 0 : error.message) || "초기화 실패" };
    }
  }
  function assertReady() {
    const state = ensureInitialized();
    if (!state.ok) {
      throw new Error(state.message || "백업 서비스를 초기화할 수 없습니다.");
    }
    return state;
  }
  async function getCurrentUser() {
    const state = ensureInitialized();
    if (!state.ok) {
      return null;
    }
    const { data, error } = await state.client.auth.getUser();
    if (error) {
      return null;
    }
    return data.user || null;
  }
  function onAuthStateChanged(callback) {
    const state = ensureInitialized();
    if (!state.ok) {
      callback(null, "SERVICE_UNAVAILABLE");
      return () => {
      };
    }
    const { data } = state.client.auth.onAuthStateChange((event, session) => {
      callback((session == null ? void 0 : session.user) || null, event);
    });
    return () => {
      var _a, _b;
      (_b = (_a = data == null ? void 0 : data.subscription) == null ? void 0 : _a.unsubscribe) == null ? void 0 : _b.call(_a);
    };
  }
  async function signInWithGoogle() {
    const state = assertReady();
    const config = getConfig();
    const { error } = await state.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: config.redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });
    if (error) {
      throw error;
    }
    return { redirecting: true };
  }
  async function signOut() {
    const state = assertReady();
    const { error } = await state.client.auth.signOut();
    if (error) {
      throw error;
    }
  }
  function normalizeVersion(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }
  function conflictError(message, meta) {
    const error = new Error(message);
    error.code = "backup-conflict";
    error.meta = meta || {};
    return error;
  }
  async function fetchBackupMeta(userId) {
    const state = assertReady();
    const { data, error } = await state.client.from(BACKUP_TABLE).select("updated_at,updated_at_client,version").eq("user_id", userId).maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return { exists: false, updatedAtClient: null, updatedAt: null, version: null };
    }
    return {
      exists: true,
      updatedAtClient: data.updated_at_client || null,
      updatedAt: data.updated_at || null,
      version: normalizeVersion(data.version)
    };
  }
  async function backupUserData(userId, payload, options) {
    const state = assertReady();
    const opts = options || {};
    const force = Boolean(opts.force);
    const baseVersion = normalizeVersion(opts.baseVersion);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const currentMeta = await fetchBackupMeta(userId);
    if (currentMeta.exists && !force) {
      if (!baseVersion || baseVersion !== currentMeta.version) {
        throw conflictError("서버에 더 최신 데이터가 있습니다. 복원 또는 강제 업로드를 선택해 주세요.", {
          serverVersion: currentMeta.version,
          serverUpdatedAt: currentMeta.updatedAt
        });
      }
    }
    const nextVersion = currentMeta.exists ? (currentMeta.version || DEFAULT_VERSION) + 1 : DEFAULT_VERSION;
    const safePayload = {
      user_id: userId,
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      cats: Array.isArray(payload.cats) ? payload.cats : [],
      checks: payload.checks && typeof payload.checks === "object" ? payload.checks : {},
      updated_at_client: now,
      version: nextVersion
    };
    if (!currentMeta.exists) {
      const { error } = await state.client.from(BACKUP_TABLE).insert(safePayload);
      if (error) {
        throw error;
      }
    } else {
      let query = state.client.from(BACKUP_TABLE).update({
        tasks: safePayload.tasks,
        cats: safePayload.cats,
        checks: safePayload.checks,
        updated_at_client: safePayload.updated_at_client,
        version: safePayload.version
      }).eq("user_id", userId);
      if (!force && baseVersion) {
        query = query.eq("version", baseVersion);
      }
      const { data, error } = await query.select("version,updated_at,updated_at_client").maybeSingle();
      if (error) {
        throw error;
      }
      if (!data) {
        throw conflictError("동기화 도중 서버 데이터가 변경되었습니다. 다시 시도해 주세요.", {
          serverVersion: currentMeta.version,
          serverUpdatedAt: currentMeta.updatedAt
        });
      }
    }
    const latest = await fetchBackupMeta(userId);
    return {
      ...safePayload,
      version: latest.version || nextVersion,
      updatedAt: latest.updatedAt || null,
      updatedAtClient: latest.updatedAtClient || now
    };
  }
  async function restoreUserData(userId) {
    const state = assertReady();
    const { data, error } = await state.client.from(BACKUP_TABLE).select("tasks,cats,checks,updated_at,updated_at_client,version").eq("user_id", userId).maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return null;
    }
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      cats: Array.isArray(data.cats) ? data.cats : [],
      checks: data.checks && typeof data.checks === "object" ? data.checks : {},
      updatedAtClient: data.updated_at_client || null,
      updatedAt: data.updated_at || null,
      version: normalizeVersion(data.version) || DEFAULT_VERSION
    };
  }
  function subscribeBackupChanges(userId, callback) {
    const state = ensureInitialized();
    if (!state.ok || !userId) {
      return () => {
      };
    }
    const channelName = `user-backups-${userId}-${Date.now()}`;
    const channel = state.client.channel(channelName).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: BACKUP_TABLE,
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload);
      }
    ).subscribe();
    return () => {
      try {
        channel.unsubscribe();
      } finally {
        state.client.removeChannel(channel);
      }
    };
  }
  window.BackupService = {
    getConfig,
    hasRequiredConfig,
    ensureInitialized,
    getCurrentUser,
    onAuthStateChanged,
    signInWithGoogle,
    signOut,
    backupUserData,
    restoreUserData,
    fetchBackupMeta,
    subscribeBackupChanges
  };
})();
