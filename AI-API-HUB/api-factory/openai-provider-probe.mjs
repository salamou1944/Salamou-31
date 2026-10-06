import https from "node:https";

const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error(JSON.stringify({ evidence_level: "FAILED", provider: "openai", reason: "OPENAI_API_KEY_MISSING" }));
  process.exit(1);
}

function request(path, method, body) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.openai.com",
      path,
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      }
    }, res => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  const models = await request("/v1/models", "GET");
  const ids = Array.isArray(models.data?.data) ? models.data.data.map(x => x.id) : [];
  const preferred = ["gpt-5-mini", "gpt-5", "gpt-4.1-mini", "gpt-4.1"];
  const selected = preferred.find(x => ids.includes(x)) ||
    ids.find(x => /^gpt-5(?:-|$)/.test(x)) ||
    ids.find(x => /^gpt-4\.1(?:-|$)/.test(x));

  if (models.status !== 200 || !selected) {
    console.log(JSON.stringify({
      evidence_level: "FAILED",
      provider: "openai",
      models_status: models.status,
      discovered_models: ids.length,
      selected_model: selected || null,
      provider_error: models.data?.error?.code || models.data?.error?.message || null,
      secret_committed: false
    }, null, 2));
    process.exit(1);
  }

  const completion = await request("/v1/responses", "POST", {
    model: selected,
    input: "Reply with exactly FREE_PROVIDER_REAL_OK"
  });

  const output = completion.data?.output_text ||
    (Array.isArray(completion.data?.output)
      ? completion.data.output.flatMap(x => Array.isArray(x.content) ? x.content : [])
          .map(x => x.text || "").join("")
      : "");
  const exact = output.trim() === "FREE_PROVIDER_REAL_OK";

  console.log(JSON.stringify({
    evidence_level: exact && completion.status === 200 ? "REAL_COMPLETION" : "FAILED",
    provider: "openai",
    base_url: "https://api.openai.com/v1",
    models_status: models.status,
    model_discovered: true,
    discovered_models: ids.length,
    selected_model: selected,
    completion_status: completion.status,
    completion_received: Boolean(output),
    exact_output_match: exact,
    provider_error: completion.data?.error?.code || completion.data?.error?.message || null,
    secret_committed: false
  }, null, 2));

  process.exit(exact && completion.status === 200 ? 0 : 1);
})().catch(err => {
  console.error(JSON.stringify({
    evidence_level: "FAILED",
    provider: "openai",
    provider_error: err.message,
    secret_committed: false
  }, null, 2));
  process.exit(1);
});
