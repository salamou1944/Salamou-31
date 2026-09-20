import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source=fs.readFileSync(path.join(import.meta.dirname,"server.js"),"utf8");
assert.match(source,/async function refundDailyQuota\(apiKey\)/);
assert.match(source,/if\(!response\.output_text\|\|typeof response\.output_text!==\"string\"\)\{await refundDailyQuota\(apiKey\)/);
assert.match(source,/catch\{await refundDailyQuota\(apiKey\);return reply\.code\(502\)/);
assert.match(source,/catch\(error\)\{try\{await refundDailyQuota\(apiKey\)/);
console.log(JSON.stringify({ok:true,contract:"provider-failure-does-not-consume-daily-quota"}));

assert.match(source,/let quotaRefunded=false;/);
assert.match(source,/const refundQuotaOnce=async\(\)=>\{/);
assert.equal((source.match(/await refundDailyQuota\(apiKey\)/g)||[]).length,1);
assert.equal((source.match(/await refundQuotaOnce\(\)/g)||[]).length,3);
