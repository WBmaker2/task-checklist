import { cp, mkdir, rm, writeFile } from "node:fs/promises";

async function run() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  await cp("index.html", "dist/index.html");
  await cp("favicon.ico", "dist/favicon.ico");
  await cp("build", "dist/build", { recursive: true });

  process.stdout.write("Prepared ./dist for deployment\n");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
