(function () {
  function getToday() {
    return new Date();
  }

  function getWeekNumber(date) {
    return Math.ceil(new Date(date).getDate() / 7);
  }

  function getWeekDates(date) {
    const d = new Date(date);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));

    const dates = [];
    for (let i = 0; i < 5; i += 1) {
      const dd = new Date(mon);
      dd.setDate(mon.getDate() + i);
      dates.push(dd);
    }
    return dates;
  }

  function fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function fmtDateKr(d) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }

  function getMonthWeeks(year, month) {
    const weeks = [];
    const last = new Date(year, month + 1, 0).getDate();
    for (let w = 1; w <= 5; w += 1) {
      const s = (w - 1) * 7 + 1;
      const e = Math.min(w * 7, last);
      if (s <= last) {
        weeks.push({ week: w, start: s, end: e });
      }
    }
    return weeks;
  }

  function shouldShow(task, date) {
    const dow = date.getDay();
    if (dow === 0 || dow === 6) {
      return false;
    }

    const mapped = dow === 0 ? 6 : dow - 1;
    const wn = getWeekNumber(date);

    if (task.repeatType === "daily") {
      return true;
    }

    if (task.repeatType === "weekly" && task.repeatDay === mapped) {
      return true;
    }

    // Monthly tasks are keyed by week-of-month only.
    if (task.repeatType === "monthly" && task.repeatWeek === wn) {
      return true;
    }

    return false;
  }

  function uid() {
    return `id_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36)}`;
  }

  function load(key, fb) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fb;
    } catch (err) {
      return fb;
    }
  }

  function save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      // ignore localStorage write failures
    }
  }

  function prettyDateTime(iso) {
    if (!iso) {
      return "없음";
    }

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return "없음";
    }

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  window.AppUtils = {
    getToday,
    getWeekNumber,
    getWeekDates,
    fmtDate,
    fmtDateKr,
    getMonthWeeks,
    shouldShow,
    uid,
    load,
    save,
    prettyDateTime,
  };
})();
