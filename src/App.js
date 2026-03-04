(function () {
  const { SAMPLE_TASKS, DEFAULT_CATEGORIES } = window.AppConstants;
  const T = window.AppTheme;
  const { load, save } = window.AppUtils;
  const { NavBtn } = window.AppComponents;

  const Dashboard = window.AppPages.Dashboard;
  const Checklist = window.AppPages.Checklist;
  const Manage = window.AppPages.Manage;
  const Stats = window.AppPages.Stats;
  const Backup = window.AppPages.Backup;

  function App() {
    const [page, setPage] = React.useState("dashboard");
    const [tasks, setTasks] = React.useState(() => load("cc_tasks", SAMPLE_TASKS));
    const [cats, setCats] = React.useState(() => load("cc_cats", DEFAULT_CATEGORIES));
    const [checks, setChecks] = React.useState(() => load("cc_checks", {}));

    React.useEffect(() => {
      save("cc_tasks", tasks);
    }, [tasks]);

    React.useEffect(() => {
      save("cc_cats", cats);
    }, [cats]);

    React.useEffect(() => {
      save("cc_checks", checks);
    }, [checks]);

    const toggle = React.useCallback((tid, ds) => {
      setChecks((prev) => {
        const k = `${tid}_${ds}`;
        const next = { ...prev };
        if (next[k]) {
          delete next[k];
        } else {
          next[k] = new Date().toISOString();
        }
        return next;
      });
    }, []);

    const reset = () => {
      if (window.confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
        setTasks(SAMPLE_TASKS);
        setCats(DEFAULT_CATEGORIES);
        setChecks({});
      }
    };

    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Noto Sans KR',sans-serif", color: T.text }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            background: `${T.bg}ee`,
            backdropFilter: "blur(10px)",
            borderBottom: `1px solid ${T.border}`,
            padding: "12px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24 }}>📋</span>
            <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 16, color: T.text, letterSpacing: -0.5 }}>
              학급 업무 체크리스트
            </span>
          </div>
          <button
            onClick={reset}
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              border: `1px solid ${T.border}`,
              background: T.surface,
              fontSize: 11,
              color: T.textMuted,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR'",
            }}
          >
            🔄 초기화
          </button>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 100px" }}>
          {page === "dashboard" && <Dashboard tasks={tasks} cats={cats} checks={checks} onToggle={toggle} />}
          {page === "checklist" && <Checklist tasks={tasks} cats={cats} checks={checks} onToggle={toggle} />}
          {page === "manage" && <Manage tasks={tasks} setTasks={setTasks} cats={cats} setCats={setCats} />}
          {page === "stats" && <Stats tasks={tasks} cats={cats} checks={checks} />}
          {page === "backup" && (
            <Backup tasks={tasks} cats={cats} checks={checks} setTasks={setTasks} setCats={setCats} setChecks={setChecks} />
          )}
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: `${T.surface}f5`,
            backdropFilter: "blur(12px)",
            borderTop: `1px solid ${T.border}`,
            display: "flex",
            justifyContent: "space-around",
            padding: "6px 0 8px",
            zIndex: 50,
          }}
        >
          <NavBtn active={page === "dashboard"} icon="🏠" label="대시보드" onClick={() => setPage("dashboard")} />
          <NavBtn active={page === "checklist"} icon="✅" label="체크리스트" onClick={() => setPage("checklist")} />
          <NavBtn active={page === "manage"} icon="⚙️" label="업무관리" onClick={() => setPage("manage")} />
          <NavBtn active={page === "stats"} icon="📊" label="통계" onClick={() => setPage("stats")} />
          <NavBtn active={page === "backup"} icon="☁️" label="백업" onClick={() => setPage("backup")} />
        </div>
      </div>
    );
  }

  window.App = App;
})();
