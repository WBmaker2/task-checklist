(function () {
  const T = window.AppTheme;
  const { inputSt, labelSt } = window.AppComponents;
  const { prettyDateTime } = window.AppUtils;

  function Backup({ tasks, cats, checks, setTasks, setCats, setChecks }) {
    const [configForm, setConfigForm] = React.useState(() => window.BackupService.getConfig());
    const [serviceState, setServiceState] = React.useState(() => window.BackupService.ensureInitialized());
    const [user, setUser] = React.useState(() => window.BackupService.getCurrentUser());
    const [meta, setMeta] = React.useState({ exists: false, updatedAtClient: null, updatedAt: null });
    const [busy, setBusy] = React.useState(false);
    const [msg, setMsg] = React.useState("");

    const configured = window.BackupService.hasRequiredConfig(configForm);

    const refreshMeta = React.useCallback(async () => {
      if (!user) {
        setMeta({ exists: false, updatedAtClient: null, updatedAt: null });
        return;
      }
      try {
        const info = await window.BackupService.fetchBackupMeta(user.uid);
        setMeta(info);
      } catch (error) {
        setMsg(`백업 메타 조회 실패: ${error.message}`);
      }
    }, [user]);

    React.useEffect(() => {
      const state = window.BackupService.ensureInitialized();
      setServiceState(state);

      if (!state.ok) {
        setUser(null);
        return undefined;
      }

      const unsubscribe = window.BackupService.onAuthStateChanged((nextUser) => {
        setUser(nextUser);
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }, []);

    React.useEffect(() => {
      refreshMeta();
    }, [refreshMeta]);

    const onChangeConfig = (key, value) => {
      setConfigForm((prev) => ({ ...prev, [key]: value }));
    };

    const saveConfig = async () => {
      setBusy(true);
      setMsg("");
      try {
        if (!window.BackupService.hasRequiredConfig(configForm)) {
          throw new Error("필수값(apiKey, authDomain, projectId, appId)을 입력해 주세요.");
        }

        const result = await window.BackupService.reinitialize(configForm);
        setServiceState(result);
        if (!result.ok) {
          throw new Error(result.message || "Firebase 초기화 실패");
        }
        setUser(window.BackupService.getCurrentUser());
        setMsg("Firebase 설정을 저장했습니다. 이제 Google 로그인을 진행할 수 있습니다.");
      } catch (error) {
        setMsg(`설정 저장 실패: ${error.message}`);
      } finally {
        setBusy(false);
      }
    };

    const login = async () => {
      setBusy(true);
      setMsg("");
      try {
        const signedUser = await window.BackupService.signInWithGoogle();
        setUser(signedUser || null);
        if (signedUser) {
          const info = await window.BackupService.fetchBackupMeta(signedUser.uid);
          setMeta(info);
        }
        setMsg("Google 로그인 성공");
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
        setMsg("먼저 로그인해 주세요.");
        return;
      }

      setBusy(true);
      setMsg("");
      try {
        await window.BackupService.backupUserData(user.uid, { tasks, cats, checks });
        await refreshMeta();
        setMsg("클라우드 백업이 완료되었습니다.");
      } catch (error) {
        setMsg(`백업 실패: ${error.message}`);
      } finally {
        setBusy(false);
      }
    };

    const restoreNow = async () => {
      if (!user) {
        setMsg("먼저 로그인해 주세요.");
        return;
      }

      const ok = window.confirm("클라우드 백업 데이터로 현재 로컬 데이터를 덮어쓸까요?");
      if (!ok) {
        return;
      }

      setBusy(true);
      setMsg("");
      try {
        const restored = await window.BackupService.restoreUserData(user.uid);
        if (!restored) {
          setMsg("복원할 백업 데이터가 없습니다.");
          return;
        }

        setTasks(restored.tasks);
        setCats(restored.cats);
        setChecks(restored.checks);
        await refreshMeta();
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
          권장 백엔드: <strong>Firebase</strong> (Google 로그인 + Firestore)
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
            marginBottom: 18,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 12px" }}>Firebase 연결 설정</h3>
          <p style={{ fontSize: 12, color: T.textMuted, margin: "0 0 14px" }}>
            Firebase Web App 설정을 한 번만 입력하면 Google 로그인으로 백업/복원이 가능합니다.
          </p>

          <label style={labelSt}>apiKey *</label>
          <input value={configForm.apiKey} onChange={(e) => onChangeConfig("apiKey", e.target.value)} style={inputSt} placeholder="AIza..." />

          <label style={labelSt}>authDomain *</label>
          <input value={configForm.authDomain} onChange={(e) => onChangeConfig("authDomain", e.target.value)} style={inputSt} placeholder="your-project.firebaseapp.com" />

          <label style={labelSt}>projectId *</label>
          <input value={configForm.projectId} onChange={(e) => onChangeConfig("projectId", e.target.value)} style={inputSt} placeholder="your-project-id" />

          <label style={labelSt}>appId *</label>
          <input value={configForm.appId} onChange={(e) => onChangeConfig("appId", e.target.value)} style={inputSt} placeholder="1:123456789:web:abcdef" />

          <label style={labelSt}>messagingSenderId</label>
          <input value={configForm.messagingSenderId} onChange={(e) => onChangeConfig("messagingSenderId", e.target.value)} style={inputSt} placeholder="123456789" />

          <label style={labelSt}>storageBucket</label>
          <input value={configForm.storageBucket} onChange={(e) => onChangeConfig("storageBucket", e.target.value)} style={{ ...inputSt, marginBottom: 6 }} placeholder="your-project.appspot.com" />

          <button
            onClick={saveConfig}
            disabled={busy}
            style={{
              marginTop: 8,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: configured ? T.accent : T.textMuted,
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            설정 저장
          </button>

          {!serviceState.ok && (
            <div style={{ marginTop: 10, fontSize: 12, color: T.danger }}>
              현재 상태: {serviceState.message}
            </div>
          )}
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
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 12px" }}>Google 백업 실행</h3>

          <div style={{ fontSize: 13, color: T.text, marginBottom: 8 }}>
            로그인 상태: {user ? `${user.displayName || "사용자"} (${user.email || "이메일 없음"})` : "미로그인"}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>
            마지막 백업: {meta.exists ? prettyDateTime(meta.updatedAtClient || meta.updatedAt) : "없음"}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={login}
              disabled={!configured || busy || !!user}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: !configured || user ? T.surfaceAlt : T.surface,
                color: T.text,
                fontWeight: 600,
                fontSize: 13,
                cursor: !configured || busy || user ? "not-allowed" : "pointer",
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
