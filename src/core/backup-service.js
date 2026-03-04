(function () {
  const BACKUP_TABLE = "user_backups";

  let initialized = false;
  let client = null;

  function sanitizeConfig(config) {
    const c = config || {};
    return {
      url: (c.url || "").trim(),
      anonKey: (c.anonKey || "").trim(),
      redirectTo: (c.redirectTo || `${window.location.origin}${window.location.pathname}`).trim(),
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
        message: "백업 기능이 아직 활성화되지 않았습니다. 관리자에게 Supabase 설정을 요청해 주세요.",
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
      callback(null);
      return () => {};
    }

    const { data } = state.client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });

    return () => {
      data?.subscription?.unsubscribe?.();
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
          prompt: "consent",
        },
      },
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

  async function backupUserData(userId, payload) {
    const state = assertReady();
    const safePayload = {
      user_id: userId,
      tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
      cats: Array.isArray(payload.cats) ? payload.cats : [],
      checks: payload.checks && typeof payload.checks === "object" ? payload.checks : {},
      updated_at_client: new Date().toISOString(),
      version: 3,
    };

    const { error } = await state.client
      .from(BACKUP_TABLE)
      .upsert(safePayload, { onConflict: "user_id" });

    if (error) {
      throw error;
    }

    return safePayload;
  }

  async function restoreUserData(userId) {
    const state = assertReady();

    const { data, error } = await state.client
      .from(BACKUP_TABLE)
      .select("tasks,cats,checks,updated_at,updated_at_client,version")
      .eq("user_id", userId)
      .maybeSingle();

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
      version: data.version || 1,
    };
  }

  async function fetchBackupMeta(userId) {
    const state = assertReady();

    const { data, error } = await state.client
      .from(BACKUP_TABLE)
      .select("updated_at,updated_at_client")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return { exists: false, updatedAtClient: null, updatedAt: null };
    }

    return {
      exists: true,
      updatedAtClient: data.updated_at_client || null,
      updatedAt: data.updated_at || null,
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
  };
})();
