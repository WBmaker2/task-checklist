import { readFile } from "node:fs/promises";

const DEFAULT_FILES = [".env.local"];

function hasUsableValue(value) {
  return typeof value === "string" ? value.trim() !== "" : value != null;
}

function decodeValue(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) {
    return "";
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  return value;
}

function parseEnvSource(source, filePath) {
  const entries = {};
  const lines = String(source || "").split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex <= 0) {
      throw new Error(`${filePath}:${index + 1} is not a valid KEY=VALUE line`);
    }

    const key = normalized.slice(0, separatorIndex).trim();
    const rawValue = normalized.slice(separatorIndex + 1);
    entries[key] = decodeValue(rawValue);
  }

  return entries;
}

function resolveFiles(files) {
  const requested = String(process.env.TASK_CHECKLIST_ENV_FILES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (requested.length > 0) {
    return requested;
  }

  return files;
}

export async function loadEnvFiles({ files = DEFAULT_FILES, override = false } = {}) {
  const skip = String(process.env.TASK_CHECKLIST_SKIP_ENV_FILES || "")
    .trim()
    .toLowerCase();

  if (skip === "true") {
    return {
      loadedFiles: [],
      appliedKeys: [],
    };
  }

  const loadedFiles = [];
  const appliedKeys = [];

  for (const filePath of resolveFiles(files)) {
    let source = "";

    try {
      source = await readFile(filePath, "utf8");
    } catch (error) {
      if (error && error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const parsed = parseEnvSource(source, filePath);
    loadedFiles.push(filePath);

    for (const [key, value] of Object.entries(parsed)) {
      if (override || !hasUsableValue(process.env[key])) {
        process.env[key] = value;
        appliedKeys.push(key);
      }
    }
  }

  return {
    loadedFiles,
    appliedKeys,
  };
}
