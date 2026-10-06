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

function retryAfterMs(response){
  const value=response.headers.get("retry-after");
  if(!value) return null;
  const seconds=Number(value);
  if(Number.isFinite(seconds)) return Math.max(0,Math.min(seconds*1000,30000));
  const date=Date.parse(value);
  return Number.isFinite(date) ? Math.max(0,Math.min(date-Date.now(),30000)) : null;
}

function retryableStatus(status){
  return status===408 || status===425 || status===429 || status>=500;
}

function backoffMs(attempt,retryAfter){
  if(retryAfter!==null) return retryAfter;
  const base=Math.min(1000*Math.pow(2,attempt),8000);
  return Math.floor(base*0.5+Math.random()*base*0.5);
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

export function createProviderAdapter(config){
  const cfg=providerConfig({provider:config});
  const zeroCost=zeroCostDecision(config);
  const maxRetries=Math.max(0,Math.min(Number(process.env.PROVIDER_MAX_RETRIES??3),5));
  const circuitThreshold=Math.max(1,Math.min(Number(process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD??3),10));
  const circuitCooldownMs=Math.max(1000,Math.min(Number(process.env.PROVIDER_CIRCUIT_COOLDOWN_MS??30000),300000));
  let consecutiveFailures=0;
  let circuitOpenedAt=0;

  function circuitState(){
    if(circuitOpenedAt && Date.now()-circuitOpenedAt<circuitCooldownMs) return {open:true,failures:consecutiveFailures,retryAfterMs:circuitCooldownMs-(Date.now()-circuitOpenedAt)};
    if(circuitOpenedAt) { circuitOpenedAt=0; consecutiveFailures=0; }
    return {open:false,failures:consecutiveFailures,retryAfterMs:0};
  }
  function recordFailure(){
    consecutiveFailures++;
    if(consecutiveFailures>=circuitThreshold) circuitOpenedAt=Date.now();
  }
  function recordSuccess(){consecutiveFailures=0;circuitOpenedAt=0;}

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
      const circuit=circuitState();
      if(circuit.open) return {available:false,reason:"circuit_open",circuit};
      return {available:true,kind:cfg.kind,model:cfg.model||null,credentialFingerprint:token(credential),circuit};
    },
    async probe(){
      if(cfg.kind!=="soat") return {ok:true,kind:cfg.kind,reason:"probe_not_required"};
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) return {ok:false,kind:"soat",reason:"missing_credentials"};
      if(!cfg.baseUrl) return {ok:false,kind:"soat",reason:"incomplete_configuration"};
      if(!process.env.SOAT_AI_PROVIDER_ID) return {ok:false,kind:"soat",reason:"missing_soat_ai_provider_id"};
      const endpoint=cfg.baseUrl+"/api/v1/projects";
      try{
        const response=await fetch(endpoint,{method:"GET",headers:{"authorization":"Bearer "+credential},signal:AbortSignal.timeout(5000)});
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
      const circuit=circuitState();
      if(circuit.open) throw new ProviderUnavailableError("Provider circuit is open");
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
      const headers={"content-type":"application/json","authorization":"Bearer "+credential};
      if(input.__idempotencyKey) headers["idempotency-key"]=String(input.__idempotencyKey);
      const retrySafe=Boolean(input.__idempotencyKey);
      let lastError=null;
      for(let attempt=0;attempt<=maxRetries;attempt++){
        try{
          const response=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(requestBody),signal:AbortSignal.timeout(30000)});
          if(response.ok){recordSuccess();return await response.json();}
          const retryAfter=retryAfterMs(response);
          const body=await response.text();
          if(!retrySafe || !retryableStatus(response.status) || attempt===maxRetries){
            recordFailure();
            throw new ProviderUnavailableError("Provider request failed: HTTP "+response.status+" "+body.slice(0,500));
          }
          lastError=new ProviderUnavailableError("Provider request failed: HTTP "+response.status);
          await sleep(backoffMs(attempt,retryAfter));
        }catch(error){
          if(error instanceof ProviderUnavailableError && !retrySafe) throw error;
          if(error instanceof ProviderUnavailableError && error.message.startsWith("Provider request failed: HTTP") && attempt===maxRetries) throw error;
          if(!retrySafe || attempt===maxRetries){
            recordFailure();
            if(error instanceof ProviderUnavailableError) throw error;
            throw new ProviderUnavailableError("Provider request failed: "+(error?.name||"network_error"));
          }
          lastError=error;
          await sleep(backoffMs(attempt,null));
        }
      }
      recordFailure();
      throw lastError||new ProviderUnavailableError("Provider request failed");
    }
  };
}
