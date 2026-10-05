import crypto from "node:crypto";

export class ProviderUnavailableError extends Error {
  constructor(message="Provider is unavailable") {
    super(message);
    this.name="ProviderUnavailableError";
    this.code="PROVIDER_UNAVAILABLE";
  }
}

export function providerConfig(manifest={}){
  const p=manifest.provider;
  if(!p) return {configured:false,kind:null,baseUrl:null,model:null,credentialEnv:null};
  const credentialEnv=typeof p.credentialEnv==="string" && /^[A-Z][A-Z0-9_]{1,127}$/.test(p.credentialEnv) ? p.credentialEnv : null;
  return {
    configured:Boolean(p.kind),
    kind:p.kind||null,
    baseUrl:typeof p.baseUrl==="string" ? p.baseUrl.replace(/\/$/,"") : null,
    model:typeof p.model==="string" ? p.model : null,
    credentialEnv
  };
}

function token(value){return crypto.createHash("sha256").update(value).digest("hex").slice(0,16);}

function zeroCostDecision(config){
  const policy=config?.freePolicy;
  if(!policy?.zeroCostOnly) return {allowed:true,mode:"normal"};
  const required=["providerId","accessClass","freeStatus","quotaBasis","hardStop","eligibilityGate","tosRisk","sourceLastResearched","sourceUrl"];
  for(const field of required){
    if(policy[field]===undefined || policy[field]===null || policy[field]==="") return {allowed:false,reason:"free_policy_incomplete",field};
  }
  if(policy.hardStop!==true) return {allowed:false,reason:"free_policy_not_hard_stop"};
  if(["avoid"].includes(policy.tosRisk)) return {allowed:false,reason:"free_policy_tos_risk"};
  if(["none","unknown"].includes(policy.freeStatus)) return {allowed:false,reason:"free_policy_not_free"};
  return {allowed:true,mode:"zero-cost"};
}

export function createProviderAdapter(config){
  const cfg=providerConfig({provider:config});
  const zeroCost=zeroCostDecision(config);
  return {
    kind:cfg.kind,
    async health(){
      if(!zeroCost.allowed) return {available:false,reason:zeroCost.reason};
      if(!cfg.configured) return {available:false,reason:"not_configured"};
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) return {available:false,reason:"missing_credentials"};
      if(!["openai-compatible","soat"].includes(cfg.kind)) return {available:false,reason:"unsupported_adapter"};
      if(!cfg.baseUrl || (cfg.kind==="openai-compatible" && !cfg.model)) return {available:false,reason:"incomplete_configuration"};
      if(cfg.kind==="soat" && !process.env.SOAT_AI_PROVIDER_ID) return {available:false,reason:"missing_soat_ai_provider_id"};
      return {available:true,kind:cfg.kind,model:cfg.model||null,credentialFingerprint:token(credential)};
    },
    async probe(){
      if(cfg.kind!=="soat") return {ok:true,kind:cfg.kind,reason:"probe_not_required"};
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) return {ok:false,kind:"soat",reason:"missing_credentials"};
      if(!cfg.baseUrl) return {ok:false,kind:"soat",reason:"incomplete_configuration"};
      if(!process.env.SOAT_AI_PROVIDER_ID) return {ok:false,kind:"soat",reason:"missing_soat_ai_provider_id"};
      const endpoint=cfg.baseUrl+"/api/v1/projects";
      try{
        const response=await fetch(endpoint,{
          method:"GET",
          headers:{"authorization":"Bearer "+credential},
          signal:AbortSignal.timeout(5000)
        });
        if(response.status>=200 && response.status<300) return {ok:true,kind:"soat",transport:true,authorization:true,status:response.status};
        if(response.status===401) return {ok:false,kind:"soat",transport:true,authorization:false,status:401,reason:"invalid_credentials"};
        if(response.status===403) return {ok:false,kind:"soat",transport:true,authorization:false,status:403,reason:"insufficient_permissions"};
        if(response.status===404) return {ok:false,kind:"soat",transport:true,authorization:null,status:404,reason:"endpoint_not_found"};
        return {ok:false,kind:"soat",transport:true,authorization:null,status:response.status,reason:"unexpected_response"};
      }catch(error){
        return {ok:false,kind:"soat",transport:false,reason:error?.name==="TimeoutError"?"timeout":"unreachable"};
      }
    },
    async execute(input){
      if(!zeroCost.allowed) throw new ProviderUnavailableError("Provider rejected by zero-cost policy: "+zeroCost.reason);
      if(!["openai-compatible","soat"].includes(cfg.kind)) throw new ProviderUnavailableError("Unsupported provider adapter");
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) throw new ProviderUnavailableError("Provider credentials are not configured");
      if(!cfg.baseUrl || (cfg.kind==="openai-compatible" && !cfg.model)) throw new ProviderUnavailableError("Provider configuration is incomplete");
      const soatProviderId=cfg.kind==="soat" ? process.env.SOAT_AI_PROVIDER_ID : null;
      if(cfg.kind==="soat" && !soatProviderId) throw new ProviderUnavailableError("SOAT_AI_PROVIDER_ID is not configured");
      const endpoint=cfg.kind==="soat" ? cfg.baseUrl+"/api/v1/chat/completions" : cfg.baseUrl+"/chat/completions";
      const messages=Array.isArray(input.messages) ? input.messages : [];
      const systemMessages=cfg.kind==="soat" ? messages.filter((message)=>message?.role==="system") : [];
      const requestMessages=cfg.kind==="soat" ? messages.filter((message)=>message?.role!=="system") : messages;
      const requestBody={
        ...(cfg.kind==="soat" ? {ai_provider_id:soatProviderId} : {model:cfg.model}),
        ...(systemMessages.length ? {instructions:systemMessages.map((message)=>message.content).join("\n\n")} : {}),
        messages:requestMessages,
        ...(input.temperature!==undefined ? {temperature:input.temperature} : {})
      };
      const response=await fetch(endpoint,{
        method:"POST",
        headers:{"content-type":"application/json","authorization":"Bearer "+credential},
        body:JSON.stringify(requestBody)
      });
      if(!response.ok){
        const body=await response.text();
        throw new ProviderUnavailableError("Provider request failed: HTTP "+response.status+" "+body.slice(0,500));
      }
      return await response.json();
    }
  };
}
