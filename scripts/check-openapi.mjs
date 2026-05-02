import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const openapiPath = "packages/api-types/openapi.json";
const schemaPath = "packages/api-types/src/schema.ts";

const exported = spawnSync("uv", ["run", "--directory", "services/api", "python", "-m", "app.export_openapi"], {
  stdio: "inherit",
});
if (exported.status !== 0) process.exit(exported.status ?? 1);

const previousOpenapi = readFileSync(openapiPath, "utf8");
const previousSchema = readFileSync(schemaPath, "utf8");

const generated = spawnSync(
  "openapi-typescript",
  [openapiPath, "-o", schemaPath],
  { stdio: "inherit", shell: process.platform === "win32" },
);
if (generated.status !== 0) process.exit(generated.status ?? 1);

const nextOpenapi = readFileSync(openapiPath, "utf8");
const nextSchema = readFileSync(schemaPath, "utf8");
const drifted = previousOpenapi !== nextOpenapi || previousSchema !== nextSchema;
if (drifted) {
  const dir = mkdtempSync(join(tmpdir(), "crema-openapi-"));
  writeFileSync(join(dir, "openapi.json"), nextOpenapi);
  writeFileSync(join(dir, "schema.ts"), nextSchema);
  writeFileSync(openapiPath, previousOpenapi);
  writeFileSync(schemaPath, previousSchema);
  console.error(`OpenAPI types drifted. Regenerated copies are in ${dir}. Run pnpm openapi:sync.`);
  process.exit(1);
}
