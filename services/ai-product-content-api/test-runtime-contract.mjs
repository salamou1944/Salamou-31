import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync(path.join(import.meta.dirname,"server.js"),"utf8");

assert.match(source,/const providerApiKey=process\.env\.AI_PROVIDER_API_KEY\|\|process\.env\.OPENAI_API_KEY\|\|""/);
assert.match(source,/const providerBaseUrl=\(process\.env\.AI_PROVIDER_BASE_URL\|\|"https:\/\/api\.openai\.com\/v1"\)/);
assert.match(source,/const model=process\.env\.AI_MODEL\|\|process\.env\.OPENAI_MODEL\|\|""/);
assert.match(source,/const ready=Boolean\(providerApiKey&&model\)&&serviceApiKeys\.size>0/);
assert.match(source,/return reply\.code\(ready\?200:503\)/);
assert.match(source,/store:false/);
assert.match(source,/return reply\.code\(502\)\.send\(\{error:"Generation failed"\}\)/);
assert.match(source,/if\(!isAuthorized\(request\)\)return reply\.code\(401\)/);
assert.match(source,/const allowedFields=new Set\(\["product_name","product_details","language","image_url"\]\)/);
assert.match(source,/if\(unknownFields\.length\)return reply\.code\(400\)/);
assert.match(source,/const quotaReserved=await consumeDailyQuota/);
assert.match(source,/const refundQuotaOnce=async\(\)=>/);
assert.match(source,/await refundQuotaOnce\(\);if\(idempotencyKey\)/);

const validationIndex=source.indexOf("const allowedFields=");
const quotaIndex=source.indexOf("quotaReserved = await consumeDailyQuota");
assert.ok(validationIndex>=0 && quotaIndex>validationIndex,"request validation must precede quota reservation");

console.log(JSON.stringify({
  ok:true,
  contracts:[
    "provider-neutral-config",
    "health-fails-closed",
    "provider-error-boundary",
    "request-field-validation",
    "validation-before-quota",
    "provider-storage-disabled"
  ]
}));
