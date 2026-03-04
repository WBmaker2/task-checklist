(function () {
  const T = window.AppTheme;
  const { prettyDateTime } = window.AppUtils;

  function Backup({ tasks, cats, checks, setTasks, setCats, setChecks }) {
    const [serviceState, setServiceState] = React.useState(() => window.BackupService.ensureInitialized());
    const [user, setUser] = React.useState(null);
    const [meta, setMeta] = React.useState({ exists: false, updatedAtClient: null, updatedAt: null });
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState("");

    const refreshMeta = React.useCallback(async (targetUser) => {
      const current = targetUser || user;
      if (!current) {
        setMeta({ exists: false, updatedAtClient: null, updatedAt: null });
        return;
      }

      try {
        const info = await window.BackupService.fetchBackupMeta(current.id);
        setMeta(info);
      } catch (error) {
        setMsg(`백업 메타 조회 실패: ${error.message}`);
      }
    }, [user]);

    React.useEffect(() => {
      let mounted = true;
      const state = window.BackupService.ensureInitialized();
      setServiceState(state);

      if (!state.ok) {
        setUser(null);
        return undefined;
      }

      window.BackupService.getCurrentUser().then((nextUser) => {
        if (mounted) {
          setUser(nextUser || null);
          if (nextUser) {
            refreshMeta(nextUser);
          }
        }
      });

      const unsubscribe = window.BackupService.onAuthStateChanged((nextUser) => {
        if (!mounted) {
          return;
        }
        setUser(nextUser || null);
        if (nextUser) {
          refreshMeta(nextUser);
        } else {
          setMeta({ exists: false, updatedAtClient: null, updatedAt: null });
        }
      });

      return () => {
        mounted = false;
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, [refreshMeta]);

    const login = async () => {
      setBusy(true);
      setMsg("");
      try {
        await window.BackupService.signInWithGoogle();
        setMsg("Google 로그인 페이지로 이동합니다.");
      } catch (error) {
        setMsg(`로그인 실패: ${error.message}`);
      } finally {
        setBusy(false);
      }
    };

    const logout = async () => {
      setBusy(true);
      setMsg("");
      try {
        await window.BackupService.signOut();
        setUser(null);
        setMeta({ exists: false, updatedAtClient: null, updatedAt: null });
        setMsg("로그아웃되었습니다.");
      } catch (error) {
        setMsg(`로그아웃 실패: ${error.message}`);
      } finally {
        setBusy(false);
      }
    };

    const backupNow = async () => {
      if (!user) {
        setMsg("먼저 Google 로그인해 주세요.");
        return;
      }

      setBusy(true);
      setMsg("");
      try {
        await window.BackupService.backupUserData(user.id, { tasks, cats, checks });
        await refreshMeta(user);
        setMsg("클라우드 백업이 완료되었습니다.");
      } catch (error) {
        setMsg(`백업 실패: ${error.message}`);
      } finally {
        setBusy(false);
      }
    };

    const restoreNow = async () => {
      if (!user) {
        setMsg("먼저 Google 로그인해 주세요.");
        return;
      }

      const ok = window.confirm("클라우드 백업 데이터로 현재 로컬 데이터를 덮어쓸까요?");
      if (!ok) {
        return;
      }

      setBusy(true);
      setMsg("");
      try {
        const restored = await window.BackupService.restoreUserData(user.id);
        if (!restored) {
          setMsg("복원할 백업 데이터가 없습니다.");
          return;
        }

        setTasks(restored.tasks);
        setCats(restored.cats);
        setChecks(restored.checks);
        await refreshMeta(user);
        setMsg("복원이 완료되었습니다.");
      } catch (error) {
        setMsg(`복원 실패: ${error.message}`);
      } finally {
        setBusy(false);
      }
    };

    return (
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: T.text }}>백업</h1>
        <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
          Google 로그인만으로 클라우드 백업/복원을 제공합니다.
        </p>

        <div
          style={{
            background: T.surface,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 10px" }}>현재 데이터</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ padding: "8px 12px", background: T.surfaceAlt, borderRadius: 10, fontSize: 12, color: T.text }}>
              업무 {tasks.length}개
            </div>
            <div style={{ padding: "8px 12px", background: T.surfaceAlt, borderRadius: 10, fontSize: 12, color: T.text }}>
              카테고리 {cats.length}개
            </div>
            <div style={{ padding: "8px 12px", background: T.surfaceAlt, borderRadius: 10, fontSize: 12, color: T.text }}>
              체크 기록 {Object.keys(checks).length}개
            </div>
          </div>
        </div>

        <div
          style={{
            background: T.surface,
            borderRadius: 16,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow,
            padding: 20,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 12px" }}>Google 백업</h3>

          <div style={{ fontSize: 13, color: T.text, marginBottom: 8 }}>
            로그인 상태: {user ? `${user.user_metadata?.full_name || "사용자"} (${user.email || "이메일 없음"})` : "미로그인"}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>
            마지막 백업: {meta.exists ? prettyDateTime(meta.updatedAtClient || meta.updatedAt) : "없음"}
          </div>

          {!serviceState.ok && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#fef2f2",
                border: `1px solid #fecaca`,
                color: T.danger,
                fontSize: 12,
              }}
            >
              {serviceState.message}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={login}
              disabled={!serviceState.ok || busy || !!user}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: !serviceState.ok || user ? T.surfaceAlt : T.surface,
                color: T.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: !serviceState.ok || busy || user ? "not-allowed" : "pointer",
              }}
            >
              Google 로그인
            </button>

            <button
              onClick={backupNow}
              disabled={!user || busy}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: !user ? T.textMuted : T.accent,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: !user || busy ? "not-allowed" : "pointer",
              }}
            >
              지금 백업
            </button>

            <button
              onClick={restoreNow}
              disabled={!user || busy}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: !user ? T.surfaceAlt : T.surface,
                color: T.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: !user || busy ? "not-allowed" : "pointer",
              }}
            >
              백업 복원
            </button>

            <button
              onClick={logout}
              disabled={!user || busy}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: T.surface,
                color: T.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: !user || busy ? "not-allowed" : "pointer",
              }}
            >
              로그아웃
            </button>
          </div>

          {msg && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: `${T.accent}12`,
                border: `1px solid ${T.border}`,
                fontSize: 12,
                color: T.text,
              }}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
    );
  }

  window.AppPages = window.AppPages || {};
  window.AppPages.Backup = Backup;
})();
