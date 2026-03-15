(function () {
  const T = window.AppTheme;
  const { prettyDateTime } = window.AppUtils;

  function statusStyle(level) {
    if (level === "error") {
      return { bg: "#fef2f2", border: "#fecaca", color: T.danger };
    }
    if (level === "warn") {
      return { bg: "#fff7ed", border: "#fed7aa", color: "#9a3412" };
    }
    if (level === "success") {
      return { bg: "#ecfdf3", border: "#86efac", color: "#166534" };
    }
    return { bg: `${T.accent}12`, border: T.border, color: T.text };
  }

  function Backup({ tasks, cats, checks, serviceState, user, meta, syncMeta, syncStatus, autoBackupDueAt, serverAhead, actions }) {
    const busy = Boolean(syncStatus && syncStatus.busy);
    const level = syncStatus?.level || "info";
    const styles = statusStyle(level);
    const migrationSteps = [
      "예전 Supabase 버전에서 마지막으로 사용하던 기기를 열고 `백업 복원`으로 최신 데이터가 맞는지 확인합니다.",
      "이 앱에서 Google 로그인을 완료합니다.",
      "`지금 백업`을 눌러 현재 데이터를 새 Firebase 백업으로 저장합니다.",
      "이후에는 이 버전만 사용하면 같은 Google 계정으로 자동 동기화됩니다.",
    ];

    return (
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: T.text }}>백업</h1>
        <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 20 }}>
          Google 로그인만으로 여러 기기 간 동기화/백업/복원을 지원합니다.
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
            background: "#fff7ed",
            borderRadius: 16,
            border: "1px solid #fed7aa",
            boxShadow: T.shadow,
            padding: 18,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: T.accent,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              ↺
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>이전 사용자 안내</h3>
              <div style={{ fontSize: 12, color: "#9a3412", marginTop: 2 }}>
                예전 Supabase 백업을 쓰고 있었다면 한 번만 옮기면 됩니다.
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {migrationSteps.map((step, index) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                }}
              >
                <div
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 999,
                    background: "#f59e0b",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.55 }}>{step}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 12, lineHeight: 1.6 }}>
            예전 앱에서 서버 복원을 한 뒤 이 화면으로 와서 백업하면, 이후부터는 Firebase 백업만 사용해도 됩니다.
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

          <div style={{ fontSize: 13, color: T.text, marginBottom: 6 }}>
            로그인 상태: {user ? `${user.user_metadata?.full_name || "사용자"} (${user.email || "이메일 없음"})` : "미로그인"}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
            서버 마지막 백업: {meta?.exists ? prettyDateTime(meta.updatedAtClient || meta.updatedAt) : "없음"}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
            서버 버전: {meta?.exists ? (meta.version || "-") : "없음"}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
            로컬 기준 버전: {syncMeta?.baseVersion || "없음"}
          </div>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>
            로컬 마지막 변경: {prettyDateTime(syncMeta?.localUpdatedAt)}
          </div>

          {!serviceState.ok && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: T.danger,
                fontSize: 12,
              }}
            >
              {serviceState.message}
            </div>
          )}

          {user && syncMeta?.dirty && autoBackupDueAt && !serverAhead && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontSize: 12,
              }}
            >
              로컬 변경이 감지되었습니다. {prettyDateTime(autoBackupDueAt)} 전후로 자동 백업됩니다.
            </div>
          )}

          {user && serverAhead && (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "#fff7ed",
                border: "1px solid #fed7aa",
                color: "#9a3412",
                fontSize: 12,
              }}
            >
              서버에 더 최신 백업이 있습니다. 안전을 위해 일반 업로드는 차단됩니다. `백업 복원` 또는 `강제 업로드`를 선택하세요.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={actions.login}
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
              onClick={actions.backupNow}
              disabled={!user || busy || serverAhead}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: !user || serverAhead ? T.textMuted : T.accent,
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: !user || busy || serverAhead ? "not-allowed" : "pointer",
              }}
            >
              지금 백업
            </button>

            <button
              onClick={actions.forceBackupNow}
              disabled={!user || busy || !meta?.exists}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: !user || !meta?.exists ? T.textMuted : "#b45309",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                cursor: !user || busy || !meta?.exists ? "not-allowed" : "pointer",
              }}
            >
              강제 업로드
            </button>

            <button
              onClick={actions.restoreNow}
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
              onClick={actions.logout}
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

            <button
              onClick={actions.refreshMeta}
              disabled={!user || busy}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: T.surface,
                color: T.textMuted,
                fontWeight: 600,
                fontSize: 13,
                cursor: !user || busy ? "not-allowed" : "pointer",
              }}
            >
              상태 새로고침
            </button>
          </div>

          {syncStatus?.message && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: styles.bg,
                border: `1px solid ${styles.border}`,
                fontSize: 12,
                color: styles.color,
              }}
            >
              {syncStatus.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  window.AppPages = window.AppPages || {};
  window.AppPages.Backup = Backup;
})();
