(function() {
  const { PRIORITY_ORDER } = window.AppConstants;
  const T = window.AppTheme;
  const { getToday, getWeekDates, fmtDate, fmtDateKr, getMonthWeeks, shouldShow } = window.AppUtils;
  const { CheckItem, TabBtn } = window.AppComponents;
  function Checklist({ tasks, cats, checks, onToggle }) {
    const [vm, setVm] = React.useState("week");
    const [cd, setCd] = React.useState(getToday());
    const [fc, setFc] = React.useState("all");
    const [fs, setFs] = React.useState("all");
    const wd = getWeekDates(cd);
    const yr = cd.getFullYear();
    const mo = cd.getMonth();
    const mw = getMonthWeeks(yr, mo);
    const cf = (t) => fc === "all" || t.categoryId === fc;
    const sf = (t, ds) => {
      if (fs === "all") {
        return true;
      }
      const done = !!checks[`${t.id}_${ds}`];
      return fs === "done" ? done : !done;
    };
    const navW = (dir) => {
      const d = new Date(cd);
      d.setDate(d.getDate() + dir * 7);
      setCd(d);
    };
    const navM = (dir) => {
      const d = new Date(cd);
      d.setMonth(d.getMonth() + dir);
      setCd(d);
    };
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { style: { fontFamily: "Outfit", fontSize: 28, fontWeight: 800, margin: "0 0 20px", color: T.text } }, "체크리스트"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { background: T.surfaceAlt, borderRadius: 25, padding: 3, display: "inline-flex" } }, /* @__PURE__ */ React.createElement(TabBtn, { active: vm === "week", onClick: () => setVm("week") }, "주별"), /* @__PURE__ */ React.createElement(TabBtn, { active: vm === "month", onClick: () => setVm("month") }, "월별")), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: fc,
        onChange: (e) => setFc(e.target.value),
        style: {
          padding: "8px 12px",
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          background: T.surface,
          fontSize: 13,
          fontFamily: "'Noto Sans KR'",
          color: T.text,
          outline: "none"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "all" }, "전체 카테고리"),
      cats.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.icon, " ", c.name))
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: fs,
        onChange: (e) => setFs(e.target.value),
        style: {
          padding: "8px 12px",
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          background: T.surface,
          fontSize: 13,
          fontFamily: "'Noto Sans KR'",
          color: T.text,
          outline: "none"
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "all" }, "전체"),
      /* @__PURE__ */ React.createElement("option", { value: "done" }, "완료"),
      /* @__PURE__ */ React.createElement("option", { value: "pending" }, "미완료")
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => vm === "week" ? navW(-1) : navM(-1),
        style: {
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `1px solid ${T.border}`,
          background: T.surface,
          cursor: "pointer",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      "←"
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 15, fontWeight: 600, color: T.text } }, vm === "week" ? `${fmtDateKr(wd[0])} ~ ${fmtDateKr(wd[4])}` : `${yr}년 ${mo + 1}월`), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => vm === "week" ? navW(1) : navM(1),
        style: {
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `1px solid ${T.border}`,
          background: T.surface,
          cursor: "pointer",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      "→"
    )), vm === "week" && wd.map((d, di) => {
      const ds = fmtDate(d);
      const isT = ds === fmtDate(getToday());
      const dt = tasks.filter((t) => shouldShow(t, d) && cf(t) && sf(t, ds)).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
      return /* @__PURE__ */ React.createElement("div", { key: di, style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            padding: "6px 12px",
            borderRadius: 10,
            background: isT ? `${T.accent}12` : "transparent"
          }
        },
        /* @__PURE__ */ React.createElement(
          "span",
          {
            style: {
              width: 32,
              height: 32,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isT ? T.accent : T.surfaceAlt,
              color: isT ? "#fff" : T.text,
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "Outfit"
            }
          },
          window.AppConstants.DAYS[di]
        ),
        /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: isT ? T.accent : T.textMuted, fontWeight: 500 } }, fmtDateKr(d), " ", isT && "· 오늘")
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 } }, dt.map((t) => /* @__PURE__ */ React.createElement(
        CheckItem,
        {
          key: t.id,
          task: t,
          cat: cats.find((c) => c.id === t.categoryId),
          checked: !!checks[`${t.id}_${ds}`],
          onToggle: () => onToggle(t.id, ds)
        }
      )), dt.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 16px", fontSize: 13, color: T.textMuted } }, "업무 없음")));
    }), vm === "month" && mw.map((w) => {
      const ws = new Date(yr, mo, w.start);
      const we = new Date(yr, mo, Math.min(w.end, new Date(yr, mo + 1, 0).getDate()));
      const wdl = [];
      for (let d = new Date(ws); d <= we; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          wdl.push(new Date(d));
        }
      }
      const all = wdl.flatMap(
        (d) => tasks.filter((t) => shouldShow(t, d) && cf(t) && sf(t, fmtDate(d))).map((t) => ({ ...t, _d: fmtDate(d), _dk: fmtDateKr(d) }))
      );
      const uniq = [];
      const seen = /* @__PURE__ */ new Set();
      all.forEach((t) => {
        const k = `${t.id}_${t._d}`;
        if (!seen.has(k)) {
          seen.add(k);
          uniq.push(t);
        }
      });
      return /* @__PURE__ */ React.createElement("div", { key: w.week, style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            fontSize: 14,
            fontWeight: 700,
            color: T.text,
            marginBottom: 10,
            padding: "8px 14px",
            background: T.surfaceAlt,
            borderRadius: 10
          }
        },
        w.week,
        "주차 ",
        /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 400, color: T.textMuted } }, "(", w.start, "일 ~ ", w.end, "일)")
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 } }, uniq.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).map((t) => /* @__PURE__ */ React.createElement(
        CheckItem,
        {
          key: `${t.id}_${t._d}`,
          task: t,
          cat: cats.find((c) => c.id === t.categoryId),
          checked: !!checks[`${t.id}_${t._d}`],
          onToggle: () => onToggle(t.id, t._d),
          showDate: t._dk
        }
      )), uniq.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: "8px 16px", fontSize: 13, color: T.textMuted } }, "이 주차에 해당하는 업무 없음")));
    }));
  }
  window.AppPages = window.AppPages || {};
  window.AppPages.Checklist = Checklist;
})();
