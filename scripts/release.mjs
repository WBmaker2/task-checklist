import { readFile, writeFile } from "node:fs/promises";

const PACKAGE_JSON_PATH = "package.json";
const PACKAGE_LOCK_PATH = "package-lock.json";
const APP_PATH = "src/App.js";
const INDEX_PATH = "index.html";
const CHANGELOG_PATH = "CHANGELOG.md";

const CHANGELOG_HEADER = `# Changelog

이 프로젝트의 주요 변경 사항을 기록합니다.
`;

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version || "").trim());
  if (!match) {
    throw new Error(`유효한 semver 버전이 아닙니다: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatSemver(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function resolveNextVersion(currentVersion, mode) {
  if (mode === "sync") {
    return currentVersion;
  }

  if (/^\d+\.\d+\.\d+$/.test(mode)) {
    return mode;
  }

  const current = parseSemver(currentVersion);
  if (mode === "patch") {
    return formatSemver({ ...current, patch: current.patch + 1 });
  }
  if (mode === "minor") {
    return formatSemver({ major: current.major, minor: current.minor + 1, patch: 0 });
  }
  if (mode === "major") {
    return formatSemver({ major: current.major + 1, minor: 0, patch: 0 });
  }

  throw new Error(`지원하지 않는 release 모드입니다: ${mode}`);
}

function ensureTrailingNewline(text) {
  return text.endsWith("\n") ? text : `${text}\n`;
}

function updateAppVersion(source, version) {
  return source.replace(/const APP_VERSION = "v[^"]+";/, `const APP_VERSION = "v${version}";`);
}

function updateIndexVersion(source, version) {
  return source.replace(/\?v=[^"]+/g, `?v=${version}`);
}

function buildChangelogEntry(version, summary, dateText) {
  const note = summary || "릴리스 요약을 여기에 추가하세요.";
  return `## v${version} - ${dateText}

- ${note}
`;
}

function hasChangelogVersion(content, version) {
  const pattern = new RegExp(`^## v${version.replace(/\./g, "\\.")} - `, "m");
  return pattern.test(content);
}

function prependChangelogEntry(existing, entry) {
  const content = existing.trim().length > 0 ? ensureTrailingNewline(existing) : `${CHANGELOG_HEADER}\n`;
  const versionMatch = /^## v([0-9]+\.[0-9]+\.[0-9]+) - /m.exec(entry);
  if (versionMatch && hasChangelogVersion(content, versionMatch[1])) {
    return content;
  }

  const normalized = content.startsWith("# Changelog") ? content : `${CHANGELOG_HEADER}\n${content}`;
  const splitMarker = "\n## ";
  const markerIndex = normalized.indexOf(splitMarker);
  if (markerIndex === -1) {
    return `${ensureTrailingNewline(normalized)}\n${entry}`;
  }

  return `${normalized.slice(0, markerIndex + 1)}${entry}\n${normalized.slice(markerIndex + 1)}`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function run() {
  const mode = (process.argv[2] || "sync").trim();
  const summary = process.argv.slice(3).join(" ").trim();

  const pkg = await readJson(PACKAGE_JSON_PATH);
  const nextVersion = resolveNextVersion(pkg.version, mode);
  const today = new Date().toISOString().slice(0, 10);

  pkg.version = nextVersion;
  await writeJson(PACKAGE_JSON_PATH, pkg);

  const lock = await readJson(PACKAGE_LOCK_PATH);
  lock.version = nextVersion;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = nextVersion;
  }
  await writeJson(PACKAGE_LOCK_PATH, lock);

  const appSource = await readFile(APP_PATH, "utf8");
  await writeFile(APP_PATH, ensureTrailingNewline(updateAppVersion(appSource, nextVersion)), "utf8");

  const indexSource = await readFile(INDEX_PATH, "utf8");
  await writeFile(INDEX_PATH, ensureTrailingNewline(updateIndexVersion(indexSource, nextVersion)), "utf8");

  let changelog = "";
  try {
    changelog = await readFile(CHANGELOG_PATH, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const entry = buildChangelogEntry(nextVersion, summary, today);
  const nextChangelog = prependChangelogEntry(changelog, entry);
  await writeFile(CHANGELOG_PATH, ensureTrailingNewline(nextChangelog), "utf8");

  process.stdout.write(`Prepared release v${nextVersion}\n`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
