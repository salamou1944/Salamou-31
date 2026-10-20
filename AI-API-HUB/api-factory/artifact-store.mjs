import fs from "node:fs";
import path from "node:path";

export function createArtifactStore({
  env = process.env,
  root = path.join(process.cwd(), "generated"),
  fetchImpl = globalThis.fetch
} = {}) {
  const url = typeof env.FACTORY_REGISTRY_URL === "string" ? env.FACTORY_REGISTRY_URL.trim().replace(/\/$/, "") : "";
  const key = typeof env.FACTORY_REGISTRY_SERVICE_ROLE_KEY === "string" ? env.FACTORY_REGISTRY_SERVICE_ROLE_KEY.trim() : "";
  const remoteRequested = Boolean(url || key);
  const remoteConfigured = Boolean(url && key);
  const bucket = typeof env.FACTORY_ARTIFACT_BUCKET === "string" && env.FACTORY_ARTIFACT_BUCKET.trim()
    ? env.FACTORY_ARTIFACT_BUCKET.trim()
    : "api-factory-artifacts";
  const mode = remoteConfigured ? "supabase-storage" : env.VERCEL ? "ephemeral-file" : "local-file";

  function objectUrl(objectKey) {
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
      headers: {
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
        const response = await fetchImpl(url + "/storage/v1/object/list/" + encodeURIComponent(bucket), {
          method: "POST",
          headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" },
          body: JSON.stringify({ prefix: "", limit: 1, offset: 0, sortBy: { column: "name", order: "asc" } }),
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) return { ok: false, mode, reason: "ARTIFACT_STORAGE_UPSTREAM_HTTP_" + response.status };
        return { ok: true, mode };
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
      const output = [];
      if (storage?.durable === true && storage.mode === "supabase-storage" && remoteConfigured) {
        const keys = Array.isArray(storage.keys) ? storage.keys : [];
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
      if (storage?.durable === true && storage.mode === "supabase-storage" && remoteConfigured) {
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
