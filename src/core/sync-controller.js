(function () {
  const { load, save } = window.AppUtils;
  const { toVersion, isServerAhead, resolveNextBaseVersion } = window.AppSyncState;

  const SYNC_META_KEY = "cc_sync_meta_v1";
  const DEFAULT_SYNC_META = {
    ownerUserId: null,
    baseVersion: null,
    dirty: false,
    localUpdatedAt: null,
    lastBackupAt: null,
  };
  const EMPTY_SERVER_META = { exists: false, updatedAtClient: null, updatedAt: null, version: null };

  function normalizeSyncMeta(raw) {
    const meta = raw && typeof raw === "object" ? raw : {};
    return {
      ownerUserId: typeof meta.ownerUserId === "string" ? meta.ownerUserId : null,
      baseVersion: toVersion(meta.baseVersion),
      dirty: Boolean(meta.dirty),
      localUpdatedAt: meta.localUpdatedAt || null,
      lastBackupAt: meta.lastBackupAt || null,
    };
  }

  function buildSyncIndicator(theme, syncServiceState, syncUser, syncStatus, serverAhead, syncMeta) {
    if (!syncServiceState.ok) {
      return {
        label: "동기화 비활성",
        bg: theme.surfaceAlt,
        border: theme.border,
        color: theme.textMuted,
        dot: theme.textMuted,
      };
    }

    if (!syncUser) {
      return {
        label: "클라우드 미로그인",
        bg: theme.surfaceAlt,
        border: theme.border,
        color: theme.textMuted,
        dot: theme.textMuted,
      };
    }

    if (syncStatus.busy) {
      return {
        label: "클라우드 동기화 중",
        bg: "#eff6ff",
        border: "#bfdbfe",
        color: "#1d4ed8",
        dot: "#2563eb",
      };
    }

    if (serverAhead) {
      return {
        label: "서버 최신 감지",
        bg: "#fff7ed",
        border: "#fed7aa",
        color: "#9a3412",
        dot: "#c2410c",
      };
    }

    if (syncMeta.dirty) {
      return {
        label: "동기화 대기중",
        bg: "#eff6ff",
        border: "#bfdbfe",
        color: "#1d4ed8",
        dot: "#2563eb",
      };
    }

    return {
      label: "동기화 완료",
      bg: "#ecfdf3",
      border: "#86efac",
      color: "#166534",
      dot: "#16a34a",
    };
  }

  function parseImportedBackup(raw) {
    const root = raw && typeof raw === "object" ? raw : null;
    if (!root) {
      throw new Error("백업 파일 형식이 올바르지 않습니다.");
    }

    const payload = root.data && typeof root.data === "object" ? root.data : root;
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : null;
    const cats = Array.isArray(payload.cats) ? payload.cats : null;
    const checks = payload.checks && typeof payload.checks === "object" ? payload.checks : null;

    if (!tasks || !cats || !checks) {
      throw new Error("업무/카테고리/체크 기록 형식을 확인해 주세요.");
    }

    return { tasks, cats, checks };
  }

  function useSyncController(options) {
    const { tasks, cats, checks, setTasks, setCats, setChecks, theme } = options;

    const [syncServiceState, setSyncServiceState] = React.useState(() => window.BackupService.ensureInitialized());
    const [syncUser, setSyncUser] = React.useState(null);
    const [syncServerMeta, setSyncServerMeta] = React.useState(EMPTY_SERVER_META);
    const [syncMeta, setSyncMeta] = React.useState(() => normalizeSyncMeta(load(SYNC_META_KEY, DEFAULT_SYNC_META)));
    const [syncStatus, setSyncStatus] = React.useState({
      busy: false,
      level: "info",
      message: "",
      conflict: false,
      conflictMeta: null,
    });
    const [autoBackupDueAt, setAutoBackupDueAt] = React.useState(null);

    const tasksInitRef = React.useRef(true);
    const catsInitRef = React.useRef(true);
    const checksInitRef = React.useRef(true);
    const skipTrackCountRef = React.useRef(0);
    const syncMetaRef = React.useRef(syncMeta);
    const syncUserRef = React.useRef(syncUser);
    const autoTimerRef = React.useRef(null);
    const promptKeyRef = React.useRef(null);

    const updateSyncMeta = React.useCallback((updater) => {
      setSyncMeta((prev) => {
        const nextRaw = typeof updater === "function" ? updater(prev) : { ...prev, ...(updater || {}) };
        const next = normalizeSyncMeta(nextRaw);
        save(SYNC_META_KEY, next);
        return next;
      });
    }, []);

    React.useEffect(() => {
      syncMetaRef.current = syncMeta;
    }, [syncMeta]);

    React.useEffect(() => {
      syncUserRef.current = syncUser;
    }, [syncUser]);

    const setStatus = React.useCallback((patchOrUpdater) => {
      setSyncStatus((prev) => {
        const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(prev) : patchOrUpdater;
        return { ...prev, ...(patch || {}) };
      });
    }, []);

    const markLocalDirty = React.useCallback(() => {
      const now = new Date().toISOString();
      updateSyncMeta((prev) => ({
        ...prev,
        dirty: true,
        localUpdatedAt: now,
      }));
    }, [updateSyncMeta]);

    React.useEffect(() => {
      save("cc_tasks", tasks);
      if (tasksInitRef.current) {
        tasksInitRef.current = false;
        return;
      }
      if (skipTrackCountRef.current > 0) {
        skipTrackCountRef.current -= 1;
        return;
      }
      markLocalDirty();
    }, [tasks, markLocalDirty]);

    React.useEffect(() => {
      save("cc_cats", cats);
      if (catsInitRef.current) {
        catsInitRef.current = false;
        return;
      }
      if (skipTrackCountRef.current > 0) {
        skipTrackCountRef.current -= 1;
        return;
      }
      markLocalDirty();
    }, [cats, markLocalDirty]);

    React.useEffect(() => {
      save("cc_checks", checks);
      if (checksInitRef.current) {
        checksInitRef.current = false;
        return;
      }
      if (skipTrackCountRef.current > 0) {
        skipTrackCountRef.current -= 1;
        return;
      }
      markLocalDirty();
    }, [checks, markLocalDirty]);

    const refreshServerMeta = React.useCallback(async (targetUser) => {
      const current = targetUser || syncUserRef.current;
      if (!current) {
        setSyncServerMeta(EMPTY_SERVER_META);
        return EMPTY_SERVER_META;
      }

      try {
        const info = await window.BackupService.fetchBackupMeta(current.id);
        setSyncServerMeta(info);
        return info;
      } catch (error) {
        setStatus({
          level: "error",
          message: `서버 상태 조회 실패: ${error.message}`,
        });
        return null;
      }
    }, [setStatus]);

    const applyRestoredData = React.useCallback((restored) => {
      skipTrackCountRef.current += 3;
      setTasks(Array.isArray(restored.tasks) ? restored.tasks : []);
      setCats(Array.isArray(restored.cats) ? restored.cats : []);
      setChecks(restored.checks && typeof restored.checks === "object" ? restored.checks : {});

      const now = new Date().toISOString();
      updateSyncMeta((prev) => ({
        ...prev,
        ownerUserId: syncUserRef.current ? syncUserRef.current.id : prev.ownerUserId,
        baseVersion: toVersion(restored.version) || prev.baseVersion,
        dirty: false,
        localUpdatedAt: now,
        lastBackupAt: restored.updatedAtClient || restored.updatedAt || prev.lastBackupAt,
      }));
    }, [setTasks, setCats, setChecks, updateSyncMeta]);

    const performRestore = React.useCallback(async (optionsArg) => {
      const options = optionsArg || {};
      const user = syncUserRef.current;
      if (!user) {
        setStatus({ level: "warn", message: "먼저 Google 로그인해 주세요." });
        return { ok: false };
      }

      if (options.confirm !== false) {
        const ok = window.confirm("클라우드 백업 데이터로 현재 로컬 데이터를 덮어쓸까요?");
        if (!ok) {
          return { ok: false, cancelled: true };
        }
      }

      setStatus({ busy: true, message: "", conflict: false, conflictMeta: null });
      try {
        const restored = await window.BackupService.restoreUserData(user.id);
        if (!restored) {
          setStatus({ busy: false, level: "warn", message: "복원할 백업 데이터가 없습니다." });
          return { ok: false };
        }

        applyRestoredData(restored);
        await refreshServerMeta(user);
        setStatus({
          busy: false,
          level: "success",
          message: options.reason === "login" ? "서버 최신 데이터를 내려받아 동기화했습니다." : "복원이 완료되었습니다.",
          conflict: false,
          conflictMeta: null,
        });
        return { ok: true, restored };
      } catch (error) {
        setStatus({ busy: false, level: "error", message: `복원 실패: ${error.message}` });
        return { ok: false, error };
      }
    }, [applyRestoredData, refreshServerMeta, setStatus]);

    const performBackup = React.useCallback(async (optionsArg) => {
      const options = optionsArg || {};
      const user = syncUserRef.current;
      if (!user) {
        setStatus({ level: "warn", message: "먼저 Google 로그인해 주세요." });
        return { ok: false };
      }

      setStatus({ busy: true, message: "", conflict: false, conflictMeta: null });
      try {
        const result = await window.BackupService.backupUserData(
          user.id,
          { tasks, cats, checks },
          {
            baseVersion: syncMetaRef.current.baseVersion,
            force: Boolean(options.force),
          }
        );

        const latest = await refreshServerMeta(user);
        const nextVersion = resolveNextBaseVersion(result.version, latest?.version, syncMetaRef.current.baseVersion);
        const nextSyncMeta = normalizeSyncMeta({
          ...syncMetaRef.current,
          ownerUserId: user.id,
          baseVersion: nextVersion || syncMetaRef.current.baseVersion,
          dirty: false,
          lastBackupAt:
            result.updatedAtClient ||
            result.updatedAt ||
            latest?.updatedAtClient ||
            latest?.updatedAt ||
            syncMetaRef.current.lastBackupAt,
        });

        syncMetaRef.current = nextSyncMeta;
        updateSyncMeta(() => nextSyncMeta);
        setStatus({
          busy: false,
          level: "success",
          conflict: false,
          conflictMeta: null,
          message: options.trigger === "auto"
            ? "자동 백업이 완료되었습니다."
            : options.force
              ? "강제 업로드가 완료되었습니다."
              : "클라우드 백업이 완료되었습니다.",
        });
        return { ok: true, result };
      } catch (error) {
        const isConflict = error && error.code === "backup-conflict";
        setStatus({
          busy: false,
          level: isConflict ? "warn" : "error",
          conflict: isConflict,
          conflictMeta: isConflict ? (error.meta || null) : null,
          message: isConflict ? error.message : `백업 실패: ${error.message}`,
        });

        if (isConflict) {
          await refreshServerMeta(user);
        }
        return { ok: false, conflict: isConflict, error };
      }
    }, [tasks, cats, checks, refreshServerMeta, setStatus, updateSyncMeta]);

    const maybePromptNewerServerData = React.useCallback(async (user, meta) => {
      if (!user || !meta || !meta.exists) {
        return;
      }

      const serverVersion = toVersion(meta.version) || 0;
      const localBase = toVersion(syncMetaRef.current.baseVersion) || 0;
      if (serverVersion <= localBase) {
        return;
      }

      const promptKey = `${user.id}:${serverVersion}`;
      if (promptKeyRef.current === promptKey) {
        return;
      }
      promptKeyRef.current = promptKey;

      const ok = window.confirm(
        `서버에 더 최신 백업(v${serverVersion})이 있습니다. 지금 다운로드할까요?\n\n확인: 서버 데이터 복원\n취소: 로컬 데이터 유지(필요 시 강제 업로드 가능)`
      );

      if (ok) {
        await performRestore({ confirm: false, reason: "login" });
      } else {
        setStatus({
          level: "warn",
          conflict: true,
          conflictMeta: { serverVersion, serverUpdatedAt: meta.updatedAt },
          message: "서버 최신 데이터가 감지되었습니다. '백업 복원' 또는 '강제 업로드'를 선택하세요.",
        });
      }
    }, [performRestore, setStatus]);

    React.useEffect(() => {
      let active = true;
      const state = window.BackupService.ensureInitialized();
      setSyncServiceState(state);

      if (!state.ok) {
        setSyncUser(null);
        return undefined;
      }

      window.BackupService.awaitAuthBootstrap().then(async (bootstrap) => {
        if (!active) {
          return;
        }

        if (bootstrap?.feedback) {
          setStatus({
            busy: false,
            level: bootstrap.feedback.level || "info",
            message: bootstrap.feedback.message || "",
            conflict: false,
            conflictMeta: null,
          });
        }

        const nextUser = bootstrap?.user || (await window.BackupService.getCurrentUser());
        setSyncUser(nextUser || null);
        if (!nextUser) {
          setSyncServerMeta(EMPTY_SERVER_META);
          return;
        }

        updateSyncMeta((prev) => {
          if (prev.ownerUserId && prev.ownerUserId !== nextUser.id) {
            return {
              ...prev,
              ownerUserId: nextUser.id,
              baseVersion: null,
              dirty: true,
            };
          }
          if (!prev.ownerUserId) {
            return { ...prev, ownerUserId: nextUser.id };
          }
          return prev;
        });

        const latest = await refreshServerMeta(nextUser);
        if (!active) {
          return;
        }
        await maybePromptNewerServerData(nextUser, latest);
      });

      const unsubscribe = window.BackupService.onAuthStateChanged(async (nextUser) => {
        if (!active) {
          return;
        }

        setSyncUser(nextUser || null);
        if (!nextUser) {
          setSyncServerMeta(EMPTY_SERVER_META);
          setStatus((prev) => ({
            ...prev,
            busy: false,
            conflict: false,
            conflictMeta: null,
          }));
          promptKeyRef.current = null;
          return;
        }

        updateSyncMeta((prev) => {
          if (prev.ownerUserId && prev.ownerUserId !== nextUser.id) {
            return {
              ...prev,
              ownerUserId: nextUser.id,
              baseVersion: null,
              dirty: true,
            };
          }
          if (!prev.ownerUserId) {
            return { ...prev, ownerUserId: nextUser.id };
          }
          return prev;
        });

        const latest = await refreshServerMeta(nextUser);
        if (!active) {
          return;
        }
        await maybePromptNewerServerData(nextUser, latest);
      });

      return () => {
        active = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [maybePromptNewerServerData, refreshServerMeta, setStatus, updateSyncMeta]);

    React.useEffect(() => {
      if (!syncServiceState.ok || !syncUser) {
        return undefined;
      }

      let active = true;

      const checkLatest = async () => {
        const latest = await refreshServerMeta(syncUser);
        if (!active || !latest || !latest.exists) {
          return;
        }

        const serverVersion = toVersion(latest.version) || 0;
        const localBase = toVersion(syncMetaRef.current.baseVersion) || 0;
        if (serverVersion > localBase) {
          setStatus((prev) => {
            if (prev.conflict && prev.conflictMeta && prev.conflictMeta.serverVersion === serverVersion) {
              return prev;
            }
            return {
              ...prev,
              level: "warn",
              conflict: true,
              conflictMeta: { serverVersion, serverUpdatedAt: latest.updatedAt },
              message: "다른 기기에서 최신 백업이 감지되었습니다. 복원하거나 강제 업로드를 선택하세요.",
            };
          });
        }
      };

      const unsubscribe = window.BackupService.subscribeBackupChanges(syncUser.id, () => {
        checkLatest();
      });

      const pollId = window.setInterval(checkLatest, 30000);

      return () => {
        active = false;
        window.clearInterval(pollId);
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [refreshServerMeta, setStatus, syncServiceState.ok, syncUser]);

    const serverAhead = isServerAhead(syncServerMeta, syncMeta);

    React.useEffect(() => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      setAutoBackupDueAt(null);

      if (!syncServiceState.ok || !syncUser || !syncMeta.dirty || serverAhead || syncStatus.busy) {
        return undefined;
      }

      const dueAt = new Date(Date.now() + 60000).toISOString();
      setAutoBackupDueAt(dueAt);
      autoTimerRef.current = window.setTimeout(() => {
        performBackup({ trigger: "auto", force: false });
      }, 60000);

      return () => {
        if (autoTimerRef.current) {
          window.clearTimeout(autoTimerRef.current);
          autoTimerRef.current = null;
        }
      };
    }, [syncServiceState.ok, syncUser, syncMeta.dirty, serverAhead, syncStatus.busy, performBackup]);

    const login = React.useCallback(async () => {
      setStatus({ busy: true, message: "", conflict: false, conflictMeta: null });
      try {
        const result = await window.BackupService.signInWithGoogle();
        if (result?.redirecting) {
          setStatus({ busy: false, level: "info", message: "Google 로그인 페이지로 이동합니다." });
          return;
        }
        setStatus({ busy: false, level: "success", message: "Google 로그인되었습니다." });
      } catch (error) {
        setStatus({ busy: false, level: "error", message: `로그인 실패: ${error.message}` });
      }
    }, [setStatus]);

    const logout = React.useCallback(async () => {
      setStatus({ busy: true, message: "", conflict: false, conflictMeta: null });
      try {
        await window.BackupService.signOut();
        setSyncUser(null);
        setSyncServerMeta(EMPTY_SERVER_META);
        setStatus({ busy: false, level: "info", message: "로그아웃되었습니다.", conflict: false, conflictMeta: null });
      } catch (error) {
        setStatus({ busy: false, level: "error", message: `로그아웃 실패: ${error.message}` });
      }
    }, [setStatus]);

    const exportLocalData = React.useCallback(() => {
      try {
        const exportedAt = new Date().toISOString();
        const payload = {
          format: "task-checklist-local-backup",
          schemaVersion: 1,
          exportedAt,
          data: {
            tasks,
            cats,
            checks,
          },
        };
        const blob = new window.Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement("a");
        const stamp = exportedAt.slice(0, 10);
        anchor.href = url;
        anchor.download = `task-checklist-backup-${stamp}.json`;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
        setStatus({
          busy: false,
          level: "success",
          conflict: false,
          conflictMeta: null,
          message: "로컬 백업 파일을 저장했습니다.",
        });
      } catch (error) {
        setStatus({
          busy: false,
          level: "error",
          conflict: false,
          conflictMeta: null,
          message: `로컬 내보내기 실패: ${error.message}`,
        });
      }
    }, [tasks, cats, checks, setStatus]);

    const importLocalData = React.useCallback(async (file) => {
      if (!file) {
        return;
      }

      try {
        const text = await file.text();
        const parsed = parseImportedBackup(JSON.parse(text));
        const ok = window.confirm("선택한 로컬 백업 파일로 현재 기기 데이터를 덮어쓸까요?");
        if (!ok) {
          return;
        }

        skipTrackCountRef.current += 3;
        setTasks(parsed.tasks);
        setCats(parsed.cats);
        setChecks(parsed.checks);

        const now = new Date().toISOString();
        updateSyncMeta((prev) => ({
          ...prev,
          dirty: true,
          localUpdatedAt: now,
        }));

        setStatus({
          busy: false,
          level: "success",
          conflict: false,
          conflictMeta: null,
          message: "로컬 백업 파일을 불러왔습니다. 필요하면 지금 백업으로 서버에 반영하세요.",
        });
      } catch (error) {
        setStatus({
          busy: false,
          level: "error",
          conflict: false,
          conflictMeta: null,
          message: `로컬 가져오기 실패: ${error.message}`,
        });
      }
    }, [setTasks, setCats, setChecks, setStatus, updateSyncMeta]);

    const backupActions = React.useMemo(() => ({
      login,
      logout,
      backupNow: () => performBackup({ trigger: "manual", force: false }),
      forceBackupNow: async () => {
        const ok = window.confirm("서버 최신 데이터를 덮어쓰고 로컬 데이터를 강제로 업로드할까요?");
        if (!ok) {
          return;
        }
        await performBackup({ trigger: "force", force: true });
      },
      restoreNow: () => performRestore({ confirm: true, reason: "manual" }),
      refreshMeta: () => refreshServerMeta(syncUserRef.current),
      exportLocalData,
      importLocalData,
    }), [login, logout, performBackup, performRestore, refreshServerMeta, exportLocalData, importLocalData]);

    const syncIndicator = React.useMemo(
      () => buildSyncIndicator(theme, syncServiceState, syncUser, syncStatus, serverAhead, syncMeta),
      [theme, syncServiceState, syncUser, syncStatus, serverAhead, syncMeta]
    );

    return {
      syncServiceState,
      syncUser,
      syncServerMeta,
      syncMeta,
      syncStatus,
      autoBackupDueAt,
      serverAhead,
      backupActions,
      syncIndicator,
    };
  }

  window.AppSyncController = {
    useSyncController,
  };
})();
