import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync(path.join(import.meta.dirname,"server.js"),"utf8");

assert.match(source,/async function refundDailyQuota\(apiKey\)/);
assert.match(source,/async function refundDailyQuota\(apiKey\)\{await acquireQuotaLock\(\);try\{/);
assert.match(source,/finally\{releaseQuotaLock\(\);\}\}/);
assert.match(source,/if\(!response\.output_text\|\|typeof response\.output_text!==\"string\"\)\{await refundQuotaOnce\(\);return reply\.code\(502\)/);
assert.match(source,/catch\{await refundQuotaOnce\(\);return reply\.code\(502\)/);
assert.match(source,/catch\(error\)\{await refundQuotaOnce\(\)/);

assert.match(source,/let quotaRefunded=false;/);
assert.match(source,/const refundQuotaOnce=async\(\)=>\{if\(quotaRefunded\)return false;quotaRefunded=true;/);
assert.match(source,/try\{return await refundDailyQuota\(apiKey\);\}catch\(refundError\)\{/);
assert.match(source,/request\.log\.error\(\{err:refundError\},\"Quota refund failed\"\)/);

assert.equal((source.match(/await refundDailyQuota\(apiKey\)/g)||[]).length,1);
assert.equal((source.match(/await refundQuotaOnce\(\)/g)||[]).length,3);

const successBlock=source.match(/const payload=\{ok:true,model,result\};[\\s\\S]*?return payload;/)?.[0]||"";
assert.match(successBlock,/return payload;/);
assert.doesNotMatch(successBlock,/await refundQuotaOnce\(\)/);

console.log(JSON.stringify({
  ok:true,
  contracts:[
    "provider-failure-refunds",
    "invalid-output-refunds",
    "refund-is-at-most-once",
    "refund-lock-is-released",
    "successful-generation-does-not-refund"
  ]
}));
