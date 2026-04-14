import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function run() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const readme = await readFile("README.md", "utf8");
  const scripts = packageJson.scripts || {};

  assert.equal(
    scripts["preview:hosting"],
    "npm run build:hosting && python3 -m http.server 4175 --directory dist"
  );
  assert.match(readme, /npm run preview:hosting/);
  assert.match(readme, /`dist\/`를 기준으로 정적 서버를 띄웁니다/);

  process.stdout.write("Preview script tests passed\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
