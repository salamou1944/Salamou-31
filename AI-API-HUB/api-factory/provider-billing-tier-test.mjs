import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const scripts = [
  { file: "free-provider-probe.mjs", env: { PROVIDER: "groq" }, provider: "groq" },
  { file: "google-provider-probe.mjs", env: {}, provider: "google_ai_studio" },
  { file: "openai-provider-probe.mjs", env: {}, provider: "openai" },
  { file: "google-factory-real-probe.mjs", env: {}, provider: "google_ai_studio" },
  { file: "nvidia-nim-probe.mjs", env: {}, provider: "nvidia_nim" },
  { file: "cloudflare-workers-ai-probe.mjs", env: {}, provider: "cloudflare_workers_ai" }
];
const cleanEnv = {
  PATH: process.env.PATH || "",
  HOME: process.env.HOME || "",
  ...(process.platform === "win32" && process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {})
};

for (const item of scripts) {
  const run = spawnSync(process.execPath, [path.resolve(item.file)], {
    cwd: process.cwd(),
    env: { ...cleanEnv, ...item.env },
    encoding: "utf8",
    timeout: 10000
  });
  assert.equal(run.error, undefined, item.file + " should exit without network access");
  assert.equal(run.status, 0, item.file + " should safely report NOT_VERIFIED");
  const output = JSON.parse(run.stdout.trim().split("\n").at(-1));
  assert.equal(output.evidence_level, "NOT_VERIFIED", item.file);
  assert.equal(output.provider, item.provider, item.file);
  assert.equal(output.network_requests_made, 0, item.file);
  assert.equal(output.secret_committed, false, item.file);
}

console.log("provider-billing-tier: all real probes fail closed before network access without explicit free-tier variables");
