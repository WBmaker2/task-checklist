(function () {
  const BACKUP_SCHEMA_VERSION = 2;
  const DEFAULT_REPEAT_TYPE = "weekly";
  const DEFAULT_PRIORITY = "medium";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function cleanString(value) {
    if (typeof value !== "string") {
      if (value == null) {
        return "";
      }
      return String(value).trim();
    }
    return value.trim();
  }

  function normalizeCategory(raw, fallbackIdSeed) {
    const id = cleanString(raw?.id) || `cat_${fallbackIdSeed}`;
    const name = cleanString(raw?.name);
    if (!name) {
      return null;
    }

    return {
      id,
      name,
      color: cleanString(raw?.color) || "#94a3b8",
      icon: cleanString(raw?.icon) || "📌",
    };
  }

  function normalizeTask(raw, fallbackCategoryId) {
    const id = cleanString(raw?.id);
    const name = cleanString(raw?.name);
    if (!id || !name) {
      return null;
    }

    const repeatType =
      raw?.repeatType === "daily" || raw?.repeatType === "weekly" || raw?.repeatType === "monthly"
        ? raw.repeatType
        : DEFAULT_REPEAT_TYPE;

    const repeatDay =
      Number.isInteger(raw?.repeatDay) && raw.repeatDay >= 0 && raw.repeatDay <= 4 ? raw.repeatDay : 0;
    const repeatWeek =
      Number.isInteger(raw?.repeatWeek) && raw.repeatWeek >= 1 && raw.repeatWeek <= 5 ? raw.repeatWeek : 1;

    const priority =
      raw?.priority === "high" || raw?.priority === "medium" || raw?.priority === "low"
        ? raw.priority
        : DEFAULT_PRIORITY;

    return {
      id,
      name,
      categoryId: cleanString(raw?.categoryId) || fallbackCategoryId,
      repeatType,
      repeatDay,
      repeatWeek,
      priority,
      memo: cleanString(raw?.memo),
    };
  }

  function normalizeChecks(rawChecks, taskIds) {
    const checks = asObject(rawChecks);
    const taskIdSet = new Set(Array.isArray(taskIds) ? taskIds : []);
    const nextChecks = {};

    for (const [rawKey, value] of Object.entries(checks)) {
      const key = cleanString(rawKey);
      const separatorIndex = key.lastIndexOf("_");
      if (separatorIndex <= 0) {
        continue;
      }

      const taskId = key.slice(0, separatorIndex);
      const datePart = key.slice(separatorIndex + 1);
      if (!taskIdSet.has(taskId)) {
        continue;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        continue;
      }

      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }

      nextChecks[key] = parsed.toISOString();
    }

    return nextChecks;
  }

  function normalizeCategoryFallbacks() {
    return asArray(window.AppConstants?.DEFAULT_CATEGORIES).map((cat, index) => normalizeCategory(cat, index)).filter(Boolean);
  }

  function normalizeAppData(raw) {
    const fallbackCategories = normalizeCategoryFallbacks();
    const sourceCats = asArray(raw?.cats);
    const normalizedCats = sourceCats.map((cat, index) => normalizeCategory(cat, index)).filter(Boolean);
    const cats = normalizedCats.length > 0 ? normalizedCats : fallbackCategories;
    const fallbackCategoryId = cats[0]?.id || "";
    const categoryIds = new Set(cats.map((cat) => cat.id));

    const tasks = asArray(raw?.tasks)
      .map((task) => normalizeTask(task, fallbackCategoryId))
      .filter(Boolean)
      .map((task) => ({
        ...task,
        categoryId: categoryIds.has(task.categoryId) ? task.categoryId : fallbackCategoryId,
      }));

    return {
      tasks,
      cats,
      checks: normalizeChecks(raw?.checks, tasks.map((task) => task.id)),
    };
  }

  function extractBackupPayload(raw) {
    const root = asObject(raw);
    const rootData = asObject(root.data);
    const hasDataPayload =
      rootData.tasks !== undefined || rootData.cats !== undefined || rootData.checks !== undefined;
    const payload = hasDataPayload ? rootData : root;
    return normalizeAppData(payload);
  }

  function toBackupDocument(appData) {
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      data: normalizeAppData(appData),
    };
  }

  function deleteTaskFromAppData(appData, taskId) {
    const normalized = normalizeAppData(appData);
    const nextTaskId = cleanString(taskId);
    if (!nextTaskId) {
      return normalized;
    }
    return normalizeAppData({
      ...normalized,
      tasks: normalized.tasks.filter((task) => task.id !== nextTaskId),
    });
  }

  function getCategoryUsage(appData, categoryId) {
    const normalized = normalizeAppData(appData);
    const normalizedCategoryId = cleanString(categoryId);

    return normalized.tasks.filter((task) => task.categoryId === normalizedCategoryId).length;
  }

  function canDeleteCategory(appData, categoryId) {
    const usage = getCategoryUsage(appData, categoryId);
    if (usage > 0) {
      return {
        ok: false,
        usage,
        message: `이 카테고리를 사용하는 업무가 ${usage}개 있습니다.`,
      };
    }

    return {
      ok: true,
      usage: 0,
      message: "",
    };
  }

  window.AppDataModel = {
    BACKUP_SCHEMA_VERSION,
    normalizeAppData,
    extractBackupPayload,
    toBackupDocument,
    deleteTaskFromAppData,
    getCategoryUsage,
    canDeleteCategory,
  };
})();
