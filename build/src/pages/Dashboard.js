(function() {
  const { DAYS, PRIORITY_ORDER } = window.AppConstants;
  const T = window.AppTheme;
  const { getToday, getWeekDates, fmtDate, shouldShow } = window.AppUtils;
  const { ProgressRing, CheckItem } = window.AppComponents;
  function Dashboard({ tasks, cats, checks, onToggle }) {
    const [selDate, setSelDate] = React.useState(getToday());
    const realToday = getToday();
    const weekDates = getWeekDates(selDate);
    const selStr = fmtDate(selDate);
    const isToday = fmtDate(selDate) === fmtDate(realToday);
    const dayTasks = tasks.filter((t) => shouldShow(t, selDate)).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    const weekTasks = weekDates.flatMap(
      (d) => tasks.filter((t) => shouldShow(t, d)).map((t) => ({ task: t, date: fmtDate(d) }))
    );
    const wTotal = weekTasks.length;
    const wDone = weekTasks.filter((wt) => checks[`${wt.task.id}_${wt.date}`]).length;
    const wPct = wTotal > 0 ? wDone / wTotal * 100 : 0;
    const tTotal = dayTasks.length;
    const tDone = dayTasks.filter((t) => checks[`${t.id}_${selStr}`]).length;
    const pending = dayTasks.filter((t) => !checks[`${t.id}_${selStr}`]);
    const navDay = (dir) => {
      const d = new Date(selDate);
      d.setDate(d.getDate() + dir);
      setSelDate(d);
    };
    const goToday = () => setSelDate(getToday());
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 28 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 6 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => navDay(-1),
        style: {
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `1px solid ${T.border}`,
          background: T.surface,
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      "←"
    ), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 15, color: T.text, fontWeight: 600, letterSpacing: 0.5 } }, selDate.getFullYear(), "년 ", selDate.getMonth() + 1, "월 ", selDate.getDate(), "일 ", [
      "일",
      "월",
      "화",
      "수",
      "목",
      "금",
      "토"
    ][selDate.getDay()], "요일"), !isToday && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: goToday,
        style: {
          marginTop: 4,
          padding: "3px 12px",
          borderRadius: 12,
          border: `1px solid ${T.accent}`,
          background: `${T.accent}12`,
          color: T.accent,
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'Noto Sans KR'"
        }
      },
      "오늘로 돌아가기"
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => navDay(1),
        style: {
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `1px solid ${T.border}`,
          background: T.surface,
          cursor: "pointer",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      "→"
    )), /* @__PURE__ */ React.createElement("h1", { style: { fontFamily: "Outfit,sans-serif", fontSize: 28, fontWeight: 800, color: T.text, margin: "4px 0 0" } }, isToday ? "오늘의 업무" : `${selDate.getMonth() + 1}/${selDate.getDate()} 업무`)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 20, marginBottom: 28, flexWrap: "wrap", justifyContent: "center" } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          flex: "1 1 160px",
          maxWidth: 220,
          background: T.surface,
          borderRadius: 20,
          padding: 24,
          textAlign: "center",
          boxShadow: T.shadow,
          border: `1px solid ${T.border}`
        }
      },
      /* @__PURE__ */ React.createElement(ProgressRing, { percent: wPct, size: 110 }),
      /* @__PURE__ */ React.createElement("div", { style: { marginTop: 10, fontSize: 13, fontWeight: 600, color: T.text } }, "이번 주 진행률"),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: T.textMuted } }, wDone, " / ", wTotal, " 완료")
    ), /* @__PURE__ */ React.createElement("div", { style: { flex: "1 1 160px", maxWidth: 220, display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: T.surface,
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: T.shadow,
          border: `1px solid ${T.border}`
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 800, fontFamily: "Outfit", color: T.accent } }, tDone, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, color: T.textMuted } }, "/", tTotal)),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: T.textMuted, fontWeight: 500 } }, "완료")
    ), /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: T.surface,
          borderRadius: 16,
          padding: "18px 20px",
          boxShadow: T.shadow,
          border: `1px solid ${T.border}`
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, fontWeight: 800, fontFamily: "Outfit", color: pending.length > 0 ? T.danger : T.success } }, pending.length),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: T.textMuted, fontWeight: 500 } }, "미완료 업무")
    ))), /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          background: T.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          boxShadow: T.shadow,
          border: `1px solid ${T.border}`
        }
      },
      /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: T.text } }, "📅 이번 주 요약 ", /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 400, color: T.textMuted } }, "· 날짜를 눌러 이동")),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, weekDates.map((d, i) => {
        const dt = tasks.filter((t) => shouldShow(t, d));
        const dd = dt.filter((t) => checks[`${t.id}_${fmtDate(d)}`]).length;
        const dtl = dt.length;
        const isSel = fmtDate(d) === selStr;
        const pct = dtl > 0 ? dd / dtl : 0;
        const isRT = fmtDate(d) === fmtDate(realToday);
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: i,
            onClick: () => setSelDate(new Date(d)),
            style: {
              flex: 1,
              textAlign: "center",
              padding: "10px 4px",
              borderRadius: 12,
              cursor: "pointer",
              background: isSel ? `${T.accent}15` : "transparent",
              border: isSel ? `2px solid ${T.accent}` : "2px solid transparent",
              transition: "all 0.2s"
            }
          },
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: isSel ? T.accent : T.textMuted } }, DAYS[i]),
          /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: isRT && !isSel ? T.accent : T.textMuted, marginTop: 2, fontWeight: isRT ? 700 : 400 } }, d.getDate(), "일", isRT && !isSel ? " ·오늘" : ""),
          /* @__PURE__ */ React.createElement(
            "div",
            {
              style: {
                width: 28,
                height: 28,
                borderRadius: "50%",
                margin: "8px auto 0",
                background: dtl === 0 ? T.surfaceAlt : pct === 1 ? T.success : pct > 0 ? T.accentLight : T.surfaceAlt,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: pct === 1 ? "#fff" : T.text
              }
            },
            dtl > 0 ? `${dd}` : "-"
          )
        );
      }))
    ), /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: T.text } }, pending.length > 0 ? "⚡ 남은 업무" : "✨ 업무를 모두 완료했어요!"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, dayTasks.map((t, i) => /* @__PURE__ */ React.createElement(
      CheckItem,
      {
        key: t.id,
        task: t,
        cat: cats.find((c) => c.id === t.categoryId),
        checked: !!checks[`${t.id}_${selStr}`],
        onToggle: () => onToggle(t.id, selStr),
        delay: i * 0.05
      }
    )), dayTasks.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: T.textMuted, fontSize: 14 } }, "등록된 업무가 없습니다 🎉")));
  }
  window.AppPages = window.AppPages || {};
  window.AppPages.Dashboard = Dashboard;
})();
