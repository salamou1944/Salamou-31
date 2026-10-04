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

export function createProviderAdapter(config){
  const cfg=providerConfig({provider:config});
  return {
    kind:cfg.kind,
    async health(){
      if(!cfg.configured) return {available:false,reason:"not_configured"};
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) return {available:false,reason:"missing_credentials"};
      if(!["openai-compatible","soat"].includes(cfg.kind)) return {available:false,reason:"unsupported_adapter"};
      if(!cfg.baseUrl || (cfg.kind==="openai-compatible" && !cfg.model)) return {available:false,reason:"incomplete_configuration"};
      if(cfg.kind==="soat" && !process.env.SOAT_AI_PROVIDER_ID) return {available:false,reason:"missing_soat_ai_provider_id"};
      return {available:true,kind:cfg.kind,model:cfg.model||null,credentialFingerprint:token(credential)};
    },
    async execute(input){
      if(!["openai-compatible","soat"].includes(cfg.kind)) throw new ProviderUnavailableError("Unsupported provider adapter");
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) throw new ProviderUnavailableError("Provider credentials are not configured");
      if(!cfg.baseUrl || (cfg.kind==="openai-compatible" && !cfg.model)) throw new ProviderUnavailableError("Provider configuration is incomplete");
      const soatProviderId=cfg.kind==="soat" ? process.env.SOAT_AI_PROVIDER_ID : null;
      if(cfg.kind==="soat" && !soatProviderId) throw new ProviderUnavailableError("SOAT_AI_PROVIDER_ID is not configured");
      const response=await fetch((cfg.baseUrl.replace(/\\/$/,""))+"/api/v1/chat/completions",{
        method:"POST",
        headers:{"content-type":"application/json","authorization":"Bearer "+credential},
        body:JSON.stringify({
          ...(cfg.kind==="soat" ? {ai_provider_id:soatProviderId} : {model:cfg.model}),
          messages:input.messages||[],
          ...(input.temperature!==undefined ? {temperature:input.temperature} : {})
        })
      });
      if(!response.ok){
        const body=await response.text();
        throw new ProviderUnavailableError("Provider request failed: HTTP "+response.status+" "+body.slice(0,500));
      }
      return await response.json();
    }
  };
}
