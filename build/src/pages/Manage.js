(function() {
  const { DAYS, PRIORITIES, REPEAT_TYPES, DEFAULT_CATEGORIES } = window.AppConstants;
  const T = window.AppTheme;
  const { uid } = window.AppUtils;
  const { inputSt, labelSt, iconBtn, CatBadge, PriBadge, IconPicker } = window.AppComponents;
  function Manage({ tasks, setTasks, cats, setCats }) {
    var _a;
    const [editing, setEditing] = React.useState(null);
    const [showForm, setShowForm] = React.useState(false);
    const [showCF, setShowCF] = React.useState(false);
    const empty = {
      name: "",
      categoryId: ((_a = cats[0]) == null ? void 0 : _a.id) || "",
      repeatType: "weekly",
      repeatDay: 0,
      repeatWeek: 1,
      priority: "medium",
      memo: ""
    };
    const [form, setForm] = React.useState(empty);
    const [nc, setNc] = React.useState({ name: "", color: "#60a5fa", icon: "📌" });
    const openNew = () => {
      setForm(empty);
      setEditing(null);
      setShowForm(true);
    };
    const openEdit = (t) => {
      setForm({ ...t });
      setEditing(t.id);
      setShowForm(true);
    };
    const saveTask = () => {
      if (!form.name.trim()) {
        return;
      }
      if (editing) {
        setTasks((p) => p.map((t) => t.id === editing ? { ...form, id: editing } : t));
      } else {
        setTasks((p) => [...p, { ...form, id: uid() }]);
      }
      setShowForm(false);
    };
    const delTask = (id) => {
      setTasks((p) => p.filter((t) => t.id !== id));
      if (editing === id) {
        setShowForm(false);
      }
    };
    const addCat = () => {
      if (!nc.name.trim()) {
        return;
      }
      setCats((p) => [...p, { ...nc, id: uid() }]);
      setNc({ name: "", color: "#60a5fa", icon: "📌" });
      setShowCF(false);
    };
    const delCat = (id) => {
      if (DEFAULT_CATEGORIES.find((c) => c.id === id)) {
        return;
      }
      setCats((p) => p.filter((c) => c.id !== id));
    };
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } }, /* @__PURE__ */ React.createElement("h1", { style: { fontFamily: "Outfit", fontSize: 28, fontWeight: 800, margin: 0, color: T.text } }, "업무 관리"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: openNew,
        style: {
          padding: "10px 20px",
          borderRadius: 25,
          border: "none",
          background: T.accent,
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          fontFamily: "'Noto Sans KR'"
        }
      },
      "+ 새 업무"
    )), showForm && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        },
        onClick: () => setShowForm(false)
      },
      /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            background: T.surface,
            borderRadius: 20,
            padding: 28,
            width: "100%",
            maxWidth: 420,
            boxShadow: T.shadowLg,
            maxHeight: "80vh",
            overflowY: "auto"
          }
        },
        /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 18, fontWeight: 700, margin: "0 0 20px", color: T.text } }, editing ? "업무 수정" : "새 업무 등록"),
        /* @__PURE__ */ React.createElement("label", { style: labelSt }, "업무명"),
        /* @__PURE__ */ React.createElement(
          "input",
          {
            value: form.name,
            onChange: (e) => setForm({ ...form, name: e.target.value }),
            placeholder: "업무명을 입력하세요",
            style: inputSt
          }
        ),
        /* @__PURE__ */ React.createElement("label", { style: labelSt }, "카테고리"),
        /* @__PURE__ */ React.createElement("select", { value: form.categoryId, onChange: (e) => setForm({ ...form, categoryId: e.target.value }), style: inputSt }, cats.map((c) => /* @__PURE__ */ React.createElement("option", { key: c.id, value: c.id }, c.icon, " ", c.name))),
        /* @__PURE__ */ React.createElement("label", { style: labelSt }, "반복 주기"),
        /* @__PURE__ */ React.createElement("select", { value: form.repeatType, onChange: (e) => setForm({ ...form, repeatType: e.target.value }), style: inputSt }, Object.entries(REPEAT_TYPES).map(([k, v]) => /* @__PURE__ */ React.createElement("option", { key: k, value: k }, v))),
        form.repeatType === "weekly" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "요일"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14 } }, DAYS.map((d, i) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: i,
            onClick: () => setForm({ ...form, repeatDay: i }),
            style: {
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: form.repeatDay === i ? T.accent : T.surface,
              color: form.repeatDay === i ? "#fff" : T.text,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR'"
            }
          },
          d
        )))),
        form.repeatType === "monthly" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("label", { style: labelSt }, "주차"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14 } }, [1, 2, 3, 4, 5].map((w) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: w,
            onClick: () => setForm({ ...form, repeatWeek: w }),
            style: {
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: form.repeatWeek === w ? T.accent : T.surface,
              color: form.repeatWeek === w ? "#fff" : T.text,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR'"
            }
          },
          w,
          "주차"
        )))),
        /* @__PURE__ */ React.createElement("label", { style: labelSt }, "우선순위"),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 14 } }, Object.entries(PRIORITIES).map(([k, v]) => /* @__PURE__ */ React.createElement(
          "button",
          {
            key: k,
            onClick: () => setForm({ ...form, priority: k }),
            style: {
              flex: 1,
              padding: "8px 0",
              borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: form.priority === k ? k === "high" ? "#ef4444" : k === "medium" ? "#f59e0b" : "#6b7280" : T.surface,
              color: form.priority === k ? "#fff" : T.text,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR'"
            }
          },
          v
        ))),
        /* @__PURE__ */ React.createElement("label", { style: labelSt }, "메모"),
        /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: form.memo,
            onChange: (e) => setForm({ ...form, memo: e.target.value }),
            placeholder: "메모 (선택)",
            rows: 2,
            style: { ...inputSt, resize: "vertical" }
          }
        ),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 20 } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: saveTask,
            style: {
              flex: 1,
              padding: "12px",
              borderRadius: 12,
              border: "none",
              background: T.accent,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR'"
            }
          },
          editing ? "수정 완료" : "등록"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setShowForm(false),
            style: {
              padding: "12px 20px",
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              fontWeight: 500,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "'Noto Sans KR'"
            }
          },
          "취소"
        ))
      )
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 } }, tasks.map((t, i) => {
      const cat = cats.find((c) => c.id === t.categoryId);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: t.id,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: T.surface,
            borderRadius: 14,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow,
            animation: `slideUp 0.3s ease ${i * 0.04}s both`
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: T.text } }, t.name), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" } }, cat && /* @__PURE__ */ React.createElement(CatBadge, { cat }), /* @__PURE__ */ React.createElement(PriBadge, { p: t.priority }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: T.textMuted } }, REPEAT_TYPES[t.repeatType], t.repeatType === "weekly" && t.repeatDay !== null && ` · ${DAYS[t.repeatDay]}요일`, t.repeatType === "monthly" && t.repeatWeek && ` · ${t.repeatWeek}주차`))),
        /* @__PURE__ */ React.createElement("button", { onClick: () => openEdit(t), style: { ...iconBtn } }, "✏️"),
        /* @__PURE__ */ React.createElement("button", { onClick: () => delTask(t.id), style: { ...iconBtn } }, "🗑️")
      );
    }), tasks.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: T.textMuted } }, "등록된 업무가 없습니다. '새 업무' 버튼을 눌러 추가하세요.")), /* @__PURE__ */ React.createElement("div", { style: { borderTop: `1px solid ${T.border}`, paddingTop: 24 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 18, fontWeight: 700, margin: 0, color: T.text } }, "카테고리 관리"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowCF(!showCF),
        style: {
          padding: "6px 14px",
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          background: T.surface,
          fontSize: 13,
          cursor: "pointer",
          fontFamily: "'Noto Sans KR'"
        }
      },
      "+ 추가"
    )), showCF && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
          padding: 14,
          background: T.surfaceAlt,
          borderRadius: 12
        }
      },
      /* @__PURE__ */ React.createElement(IconPicker, { value: nc.icon, onChange: (v) => setNc({ ...nc, icon: v }) }),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          value: nc.name,
          onChange: (e) => setNc({ ...nc, name: e.target.value }),
          placeholder: "카테고리명",
          style: { ...inputSt, flex: 1, minWidth: 100, marginBottom: 0 }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "color",
          value: nc.color,
          onChange: (e) => setNc({ ...nc, color: e.target.value }),
          style: { width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer" }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: addCat,
          style: {
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: T.accent,
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Noto Sans KR'"
          }
        },
        "추가"
      )
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, cats.map((c) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: c.id,
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 20,
          background: `${c.color}18`,
          border: `1px solid ${c.color}33`
        }
      },
      /* @__PURE__ */ React.createElement("span", null, c.icon),
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 500, color: c.color } }, c.name),
      !DEFAULT_CATEGORIES.find((dc) => dc.id === c.id) && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => delCat(c.id),
          style: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: T.textMuted, padding: 0 }
        },
        "✕"
      )
    )))));
  }
  window.AppPages = window.AppPages || {};
  window.AppPages.Manage = Manage;
})();
