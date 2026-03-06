(function () {
  const T = window.AppTheme;
  const { getToday, getWeekNumber, fmtDate, getFirstWorkdayOfMonthWeek, shouldShow } = window.AppUtils;
  const { ProgressRing, CatBadge } = window.AppComponents;

  function Stats({ tasks, cats, checks }) {
    const today = getToday();
    const yr = today.getFullYear();
    const mo = today.getMonth();

    const monthOccurrences = React.useMemo(() => {
      const occurrences = [];
      const last = new Date(yr, mo + 1, 0).getDate();

      for (let d = 1; d <= last; d += 1) {
        const dt = new Date(yr, mo, d);
        if (dt.getDay() === 0 || dt.getDay() === 6) {
          continue;
        }

        const ds = fmtDate(dt);
        tasks.forEach((t) => {
          if (t.repeatType !== "monthly" && shouldShow(t, dt)) {
            occurrences.push({ task: t, ds, week: getWeekNumber(dt), date: dt });
          }
        });
      }

      for (let week = 1; week <= 5; week += 1) {
        const anchor = getFirstWorkdayOfMonthWeek(yr, mo, week);
        if (!anchor) {
          continue;
        }

        const ds = fmtDate(anchor);
        tasks.forEach((t) => {
          if (t.repeatType === "monthly" && t.repeatWeek === week) {
            occurrences.push({ task: t, ds, week, date: anchor });
          }
        });
      }

      return occurrences;
    }, [tasks, yr, mo]);

    const monthData = React.useMemo(() => {
      return [1, 2, 3, 4, 5].map((w) => {
        const occurrences = monthOccurrences.filter((item) => item.week === w);
        const total = occurrences.length;
        const done = occurrences.filter((item) => checks[`${item.task.id}_${item.ds}`]).length;

        return { week: w, total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
      });
    }, [monthOccurrences, checks]);

    const catData = React.useMemo(() => {
      return cats
        .map((cat) => {
          const occurrences = monthOccurrences.filter((item) => item.task.categoryId === cat.id);
          const total = occurrences.length;
          const done = occurrences.filter((item) => checks[`${item.task.id}_${item.ds}`]).length;

          return { ...cat, total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
        })
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total);
    }, [monthOccurrences, cats, checks]);

    const missed = React.useMemo(() => {
      const m = {};
      monthOccurrences.forEach((item) => {
        if (item.date > today) {
          return;
        }
        if (!checks[`${item.task.id}_${item.ds}`]) {
          m[item.task.id] = (m[item.task.id] || 0) + 1;
        }
      });

      return Object.entries(m)
        .map(([id, cnt]) => ({ task: tasks.find((t) => t.id === id), count: cnt }))
        .filter((x) => x.task)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }, [monthOccurrences, tasks, checks, today]);

    const oT = monthData.reduce((s, w) => s + w.total, 0);
    const oD = monthData.reduce((s, w) => s + w.done, 0);
    const oR = oT > 0 ? Math.round((oD / oT) * 100) : 0;

    return (
      <div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, margin: "0 0 6px", color: T.text }}>통계</h1>
        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 24px" }}>
          {yr}년 {mo + 1}월
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: 24,
            background: T.surface,
            borderRadius: 20,
            boxShadow: T.shadow,
            border: `1px solid ${T.border}`,
            marginBottom: 24,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <ProgressRing percent={oR} size={130} stroke={12} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Outfit", color: T.text }}>
              {oD} / {oT}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted }}>이번 달 완료 업무</div>
          </div>
        </div>

        <div
          style={{
            background: T.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            boxShadow: T.shadow,
            border: `1px solid ${T.border}`,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: T.text }}>📊 주차별 완료율</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {monthData.map((w) => (
              <div key={w.week}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{w.week}주차</span>
                  <span style={{ fontSize: 12, color: T.textMuted }}>
                    {w.done}/{w.total} ({w.rate}%)
                  </span>
                </div>
                <div style={{ height: 20, background: T.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 10,
                      width: `${w.rate}%`,
                      background: `linear-gradient(90deg,${T.accent},${T.accentLight})`,
                      transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: T.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            boxShadow: T.shadow,
            border: `1px solid ${T.border}`,
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: T.text }}>🏷️ 카테고리별 완료율</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {catData.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{c.name}</span>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{c.rate}%</span>
                  </div>
                  <div style={{ height: 8, background: T.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: c.color, width: `${c.rate}%`, transition: "width 0.8s ease" }} />
                  </div>
                </div>
              </div>
            ))}
            {catData.length === 0 && <div style={{ fontSize: 13, color: T.textMuted }}>데이터 없음</div>}
          </div>
        </div>

        <div style={{ background: T.surface, borderRadius: 16, padding: 20, boxShadow: T.shadow, border: `1px solid ${T.border}` }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px", color: T.text }}>⚠️ 자주 놓친 업무 TOP 5</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missed.map((m, i) => {
              const cat = cats.find((c) => c.id === m.task.categoryId);
              return (
                <div
                  key={m.task.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: i === 0 ? "#fef2f2" : T.bg,
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 18, color: i === 0 ? "#ef4444" : T.textMuted, width: 24 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.task.name}</div>
                    {cat && <CatBadge cat={cat} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{m.count}회</span>
                </div>
              );
            })}
            {missed.length === 0 && <div style={{ textAlign: "center", padding: 20, color: T.textMuted, fontSize: 13 }}>놓친 업무가 없습니다! 🎉</div>}
          </div>
        </div>
      </div>
    );
  }

  window.AppPages = window.AppPages || {};
  window.AppPages.Stats = Stats;
})();
