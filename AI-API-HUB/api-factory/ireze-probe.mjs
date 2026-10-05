import {createProviderAdapter} from "./provider.mjs";

const baseUrl=(process.env.IREZE_BASE_URL||"https://directrouter.pages.dev/v1").replace(/\/$/,"");
const apiKey=process.env.IREZE_API_KEY||"";
const model=process.env.IREZE_MODEL||"";

if(!apiKey){
  console.error(JSON.stringify({ok:false,provider:"ireze",reason:"IREZE_API_KEY_REQUIRED"}));
  process.exit(2);
}

async function request(path,init={}){
  const response=await fetch(baseUrl+path,{
    ...init,
    headers:{
      ...(init.headers||{}),
      authorization:"Bearer "+apiKey,
      "content-type":"application/json"
    },
    signal:AbortSignal.timeout(15000)
  });
  const text=await response.text();
  let body;
  try{body=JSON.parse(text);}catch{body={raw:text.slice(0,1000)};}
  return {status:response.status,ok:response.ok,body};
}

const models=await request("/models");
const ids=Array.isArray(models.body?.data)?models.body.data.map(x=>x?.id).filter(Boolean):[];
const selected=model||ids[0]||null;
if(!selected){
  console.log(JSON.stringify({
    ok:false,provider:"ireze",stage:"models",status:models.status,
    reason:"NO_MODEL_DISCOVERED",model_ids:ids
  }));
  process.exit(1);
}

const completion=await request("/chat/completions",{
  method:"POST",
  body:JSON.stringify({
    model:selected,
    messages:[{role:"user",content:"Reply with exactly: IREZE_REAL_COMPLETION_OK"}],
    max_tokens:32,
    temperature:0
  })
});

const output=completion.body?.choices?.[0]?.message?.content;
const ok=completion.ok && typeof output==="string" && output.length>0;

console.log(JSON.stringify({
  ok,
  provider:"ireze",
  base_url:baseUrl,
  models_status:models.status,
  discovered_model_count:ids.length,
  model:selected,
  completion_status:completion.status,
  completion_received:typeof output==="string" && output.length>0,
  output_match:output==="IREZE_REAL_COMPLETION_OK",
  evidence_level:ok?"provider-runtime":"unverified"
},null,2));

process.exit(ok?0:1);
