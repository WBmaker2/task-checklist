import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { transform } from "esbuild";

const outDir = "build";

const orderedSources = [
  "src/config/firebase-config.js",
  "src/core/constants.js",
  "src/core/theme.js",
  "src/core/utils.js",
  "src/core/backup-service.js",
  "src/core/components.js",
  "src/pages/Dashboard.js",
  "src/pages/Checklist.js",
  "src/pages/Manage.js",
  "src/pages/Stats.js",
  "src/pages/Backup.js",
  "src/App.js",
  "src/main.js",
];

const copiedAssets = ["styles/main.css", "favicon.ico"];

async function ensureDirFor(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function transpileFile(inputPath) {
  const source = await readFile(inputPath, "utf8");
  const result = await transform(source, {
    loader: "jsx",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    target: "es2018",
    charset: "utf8",
    sourcefile: inputPath,
  });

  const outputPath = path.join(outDir, inputPath);
  await ensureDirFor(outputPath);
  await writeFile(outputPath, result.code, "utf8");
  return outputPath;
}

async function copyAsset(assetPath) {
  const content = await readFile(assetPath);
  const outputPath = path.join(outDir, assetPath);
  await ensureDirFor(outputPath);
  await writeFile(outputPath, content);
  return outputPath;
}

async function run() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const srcFile of orderedSources) {
    await transpileFile(srcFile);
  }

  for (const asset of copiedAssets) {
    await copyAsset(asset);
  }

  const summary = [
    ...orderedSources.map((f) => path.join(outDir, f)),
    ...copiedAssets.map((f) => path.join(outDir, f)),
  ];

  process.stdout.write(`Built ${summary.length} files into ./${outDir}\n`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
