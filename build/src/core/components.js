(function() {
  const { PRIORITIES, ICON_OPTIONS } = window.AppConstants;
  const T = window.AppTheme;
  const inputSt = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    background: T.bg,
    fontSize: 14,
    fontFamily: "'Noto Sans KR',sans-serif",
    color: T.text,
    outline: "none",
    marginBottom: 14,
    boxSizing: "border-box"
  };
  const labelSt = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: T.textMuted,
    marginBottom: 5
  };
  const iconBtn = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: `1px solid ${T.border}`,
    background: T.bg,
    cursor: "pointer",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  };
  function ProgressRing({ percent, size = 120, stroke = 10 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - percent / 100 * circ;
    return /* @__PURE__ */ React.createElement("svg", { width: size, height: size, style: { transform: "rotate(-90deg)" } }, /* @__PURE__ */ React.createElement("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: T.surfaceAlt, strokeWidth: stroke }), /* @__PURE__ */ React.createElement(
      "circle",
      {
        cx: size / 2,
        cy: size / 2,
        r,
        fill: "none",
        stroke: T.accent,
        strokeWidth: stroke,
        strokeDasharray: circ,
        strokeDashoffset: offset,
        strokeLinecap: "round",
        style: { transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }
      }
    ), /* @__PURE__ */ React.createElement(
      "text",
      {
        x: size / 2,
        y: size / 2,
        textAnchor: "middle",
        dominantBaseline: "central",
        style: {
          transform: "rotate(90deg)",
          transformOrigin: "center",
          fontSize: size * 0.26,
          fontWeight: 700,
          fill: T.text,
          fontFamily: "Outfit"
        }
      },
      Math.round(percent),
      "%"
    ));
  }
  function CatBadge({ cat }) {
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 500,
          background: `${cat.color}22`,
          color: cat.color,
          border: `1px solid ${cat.color}44`
        }
      },
      cat.icon,
      " ",
      cat.name
    );
  }
  function PriBadge({ p }) {
    const c = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };
    return /* @__PURE__ */ React.createElement(
      "span",
      {
        style: {
          fontSize: 11,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: 10,
          background: `${c[p]}18`,
          color: c[p],
          border: `1px solid ${c[p]}33`
        }
      },
      PRIORITIES[p]
    );
  }
  function CheckItem({ task, cat, checked, onToggle, showDate, delay = 0 }) {
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: onToggle,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: checked ? `${T.surfaceAlt}88` : T.surface,
          borderRadius: 12,
          cursor: "pointer",
          border: `1px solid ${T.border}`,
          transition: "all 0.25s",
          opacity: checked ? 0.65 : 1,
          animation: `slideUp 0.4s ease ${delay}s both`
        }
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            width: 24,
            height: 24,
            borderRadius: 8,
            flexShrink: 0,
            border: checked ? "none" : `2px solid ${T.border}`,
            background: checked ? T.accent : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s"
          }
        },
        checked && /* @__PURE__ */ React.createElement("span", { style: { color: "#fff", fontSize: 14, fontWeight: 700 } }, "✓")
      ),
      /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            fontSize: 14,
            fontWeight: 500,
            color: T.text,
            textDecoration: checked ? "line-through" : "none",
            opacity: checked ? 0.6 : 1
          }
        },
        task.name
      ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" } }, cat && /* @__PURE__ */ React.createElement(CatBadge, { cat }), /* @__PURE__ */ React.createElement(PriBadge, { p: task.priority }), showDate && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: T.textMuted } }, showDate), task.memo && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: T.textMuted } }, "💡 ", task.memo)))
    );
  }
  function TabBtn({ active, onClick, children }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick,
        style: {
          padding: "8px 20px",
          borderRadius: 25,
          border: "none",
          background: active ? T.accent : "transparent",
          color: active ? "#fff" : T.textMuted,
          fontWeight: active ? 600 : 400,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "'Noto Sans KR',sans-serif",
          transition: "all 0.25s"
        }
      },
      children
    );
  }
  function NavBtn({ active, icon, label, onClick }) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick,
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          padding: "8px 14px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: active ? T.accent : T.textMuted,
          fontFamily: "'Noto Sans KR',sans-serif",
          fontSize: 11,
          fontWeight: active ? 600 : 400,
          transition: "color 0.2s",
          position: "relative"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, icon),
      label,
      active && /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 20,
            height: 3,
            background: T.accent,
            borderRadius: 2
          }
        }
      )
    );
  }
  function IconPicker({ value, onChange }) {
    const [open, setOpen] = React.useState(false);
    return /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setOpen(!open),
        style: {
          width: 50,
          height: 44,
          borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: T.surface,
          fontSize: 22,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      value || "📌"
    ), open && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: 0,
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 12,
          boxShadow: T.shadowLg,
          zIndex: 200,
          width: "min(248px, calc(100vw - 56px))",
          boxSizing: "border-box",
          overflow: "hidden"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 8 } }, "아이콘 선택"),
      /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 4 } }, ICON_OPTIONS.map((ic, i) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: i,
          onClick: () => {
            onChange(ic);
            setOpen(false);
          },
          style: {
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: 6,
            border: value === ic ? `2px solid ${T.accent}` : "1px solid transparent",
            background: value === ic ? `${T.accentLight}44` : "transparent",
            fontSize: 15,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "all 0.15s"
          }
        },
        ic
      )))
    ));
  }
  window.AppComponents = {
    inputSt,
    labelSt,
    iconBtn,
    ProgressRing,
    CatBadge,
    PriBadge,
    CheckItem,
    TabBtn,
    NavBtn,
    IconPicker
  };
})();
