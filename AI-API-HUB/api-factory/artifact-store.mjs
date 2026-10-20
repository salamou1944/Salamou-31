import fs from "node:fs";
import path from "node:path";

export function createArtifactStore({
  env = process.env,
  root = path.join(process.cwd(), "generated"),
  fetchImpl = globalThis.fetch
} = {}) {
  const url = typeof env.FACTORY_REGISTRY_URL === "string" ? env.FACTORY_REGISTRY_URL.trim().replace(/\/$/, "") : "";
  const key = typeof env.FACTORY_REGISTRY_SERVICE_ROLE_KEY === "string" ? env.FACTORY_REGISTRY_SERVICE_ROLE_KEY.trim() : "";
  const gateway = typeof env.FACTORY_STORAGE_GATEWAY_URL === "string" ? env.FACTORY_STORAGE_GATEWAY_URL.trim().replace(/\/$/, "") : "";
  const internalKey = typeof env.FACTORY_API_KEY === "string" ? env.FACTORY_API_KEY.trim() : "";
  const gatewayConfigured = Boolean(url && gateway && internalKey);
  const remoteRequested = Boolean(url || key || gateway);
  const remoteConfigured = Boolean(url && (key || gatewayConfigured));
  const useGateway = gatewayConfigured && !key;
  const bucket = typeof env.FACTORY_ARTIFACT_BUCKET === "string" && env.FACTORY_ARTIFACT_BUCKET.trim()
    ? env.FACTORY_ARTIFACT_BUCKET.trim()
    : "api-factory-artifacts";
  const mode = remoteConfigured ? (useGateway ? "supabase-edge-gateway" : "supabase-storage") : env.VERCEL ? "ephemeral-file" : "local-file";

  function objectUrl(objectKey) {
    if (useGateway) return gateway + "/artifacts/" + objectKey.split("/").map(encodeURIComponent).join("/");
    return url + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + objectKey.split("/").map(encodeURIComponent).join("/");
  }

  async function request(method, objectKey, body, contentType) {
    if (!remoteConfigured) {
      const error = new Error(remoteRequested ? "Artifact storage configuration is incomplete" : "Durable artifact storage is not configured");
      error.code = "ARTIFACT_STORAGE_NOT_CONFIGURED";
      throw error;
    }
    const response = await fetchImpl(objectUrl(objectKey), {
      method,
      headers: useGateway
        ? { "x-factory-key": internalKey, ...(contentType ? { "content-type": contentType } : {}) }
        : {
            apikey: key,
            authorization: "Bearer " + key,
            ...(contentType ? { "content-type": contentType } : {}),
            ...(method === "PUT" ? { "x-upsert": "true" } : {})
          },
      ...(body === undefined ? {} : { body }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      const error = new Error("Artifact storage request failed with HTTP " + response.status);
      error.code = "ARTIFACT_STORAGE_UPSTREAM_ERROR";
      error.status = response.status;
      throw error;
    }
    return response;
  }

  return {
    mode,
    durable: remoteConfigured,
    async check() {
      if (!remoteConfigured) return { ok: false, mode, reason: remoteRequested ? "ARTIFACT_STORAGE_CONFIGURATION_INCOMPLETE" : "ARTIFACT_STORAGE_NOT_CONFIGURED" };
      try {
        if (useGateway) {
          const response = await fetchImpl(gateway + "/artifacts/check", {
            method: "POST",
            headers: { "x-factory-key": internalKey, "content-type": "application/json" },
            body: "{}",
            signal: AbortSignal.timeout(10000)
          });
          if (!response.ok) return { ok: false, mode, reason: "ARTIFACT_STORAGE_UPSTREAM_HTTP_" + response.status };
          const probe = await response.json();
          return probe?.ok === true && probe?.write === true && probe?.read === true && probe?.verified === true
            ? { ok: true, mode, writeVerified: true }
            : { ok: false, mode, reason: "ARTIFACT_STORAGE_WRITE_READ_UNVERIFIED" };
        }
        // Listing a bucket proves permissions to list, not that generated artifacts can be written and read.
        // Verify the exact storage path used by generated artifacts with a small, deterministic probe.
        const probeKey = "api-factory-healthcheck/readiness-probe.txt";
        const probeContent = "api-factory-artifact-readiness-v1";
        await request("PUT", probeKey, probeContent, "text/plain; charset=utf-8");
        const downloaded = await request("GET", probeKey);
        if (await downloaded.text() !== probeContent) {
          return { ok: false, mode, reason: "ARTIFACT_STORAGE_WRITE_READ_UNVERIFIED" };
        }
        return { ok: true, mode, writeVerified: true };
      } catch (error) {
        return { ok: false, mode, reason: error?.code || "ARTIFACT_STORAGE_CHECK_FAILED" };
      }
    },
    async persist(artifact, apiName) {
      if (!artifact || !Array.isArray(artifact.files) || typeof artifact.directory !== "string") {
        throw new TypeError("Artifact metadata is invalid");
      }
      if (!remoteRequested) {
        return {
          ...artifact,
          storage: {
            mode,
            durable: false,
            bucket: null,
            keys: artifact.files.map(file => apiName + "/" + file)
          }
        };
      }
      if (!remoteConfigured) {
        const error = new Error("Artifact storage configuration is incomplete");
        error.code = "ARTIFACT_STORAGE_NOT_CONFIGURED";
        throw error;
      }
      const keys = [];
      for (const file of artifact.files) {
        if (path.basename(file) !== file || file === "." || file === "..") {
          throw new Error("Unsafe artifact file name");
        }
        const objectKey = apiName + "/" + file;
        const content = fs.readFileSync(path.join(artifact.directory, file));
        const contentType = file.endsWith(".json") ? "application/json; charset=utf-8"
          : file.endsWith(".md") ? "text/markdown; charset=utf-8"
          : "text/plain; charset=utf-8";
        await request("PUT", objectKey, content, contentType);
        keys.push(objectKey);
      }
      return {
        ...artifact,
        storage: { mode, durable: true, bucket, keys }
      };
    },
    async readFiles(artifact) {
      const files = Array.isArray(artifact?.files) ? artifact.files : [];
      const storage = artifact?.storage;
      if (storage?.durable === true && ["supabase-storage", "supabase-edge-gateway"].includes(storage.mode) && remoteConfigured) {
        const keys = Array.isArray(storage.keys) ? storage.keys : [];
        const output = [];
        for (const file of files) {
          const objectKey = keys.find(key => key.endsWith("/" + file));
          if (!objectKey) {
            const error = new Error("Artifact object is missing: " + file);
            error.code = "ARTIFACT_NOT_FOUND";
            throw error;
          }
          const response = await request("GET", objectKey);
          output.push({ name: file, content: await response.text() });
        }
        return output;
      }
      const directory = typeof artifact?.directory === "string" ? artifact.directory : "";
      const output = [];
      for (const file of files) {
        const fullPath = directory ? path.join(directory, file) : "";
        if (!fullPath || !fs.existsSync(fullPath)) {
          const error = new Error("Artifact file is missing: " + file);
          error.code = "ARTIFACT_NOT_FOUND";
          throw error;
        }
        output.push({ name: file, content: fs.readFileSync(fullPath, "utf8") });
      }
      return output;
    },
    async inspect(artifact) {
      const files = Array.isArray(artifact?.files) ? artifact.files : [];
      const storage = artifact?.storage;
      if (storage?.durable === true && ["supabase-storage", "supabase-edge-gateway"].includes(storage.mode) && remoteConfigured) {
        const keys = Array.isArray(storage.keys) ? storage.keys : [];
        const present = [];
        const missing = [];
        for (const file of files) {
          const keyForFile = keys.find(key => key.endsWith("/" + file));
          if (!keyForFile) {
            missing.push(file);
            continue;
          }
          try {
            await request("GET", keyForFile);
            present.push(file);
          } catch {
            missing.push(file);
          }
        }
        return { artifactPresent: present.length === files.length, files: present, missing, durable: true, mode: storage.mode };
      }
      const directory = typeof artifact?.directory === "string" ? artifact.directory : "";
      const present = directory ? files.filter(file => fs.existsSync(path.join(directory, file))) : [];
      return {
        artifactPresent: present.length === files.length,
        files: present,
        missing: files.filter(file => !present.includes(file)),
        durable: false,
        mode: storage?.mode || mode
      };
    }
  };
}
