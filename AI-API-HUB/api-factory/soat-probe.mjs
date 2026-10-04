import {createProviderAdapter} from "./provider.mjs";

const baseUrl=process.env.SOAT_BASE_URL;
const credentialEnv="SOAT_API_KEY";

if(!baseUrl){
  console.error("SOAT_BASE_URL is required");
  process.exit(2);
}
if(!process.env[credentialEnv]){
  console.error("SOAT_API_KEY is required");
  process.exit(2);
}
if(!process.env.SOAT_AI_PROVIDER_ID){
  console.error("SOAT_AI_PROVIDER_ID is required");
  process.exit(2);
}

const adapter=createProviderAdapter({
  kind:"soat",
  baseUrl,
  credentialEnv
});
const result=await adapter.probe();
console.log(JSON.stringify(result,null,2));
process.exit(result.ok?0:1);
