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
      if(cfg.kind!=="openai-compatible") return {available:false,reason:"unsupported_adapter"};
      if(!cfg.baseUrl || !cfg.model) return {available:false,reason:"incomplete_configuration"};
      return {available:true,kind:cfg.kind,model:cfg.model,credentialFingerprint:token(credential)};
    },
    async execute(input){
      if(cfg.kind!=="openai-compatible") throw new ProviderUnavailableError("Unsupported provider adapter");
      const credential=cfg.credentialEnv ? process.env[cfg.credentialEnv] : null;
      if(!credential) throw new ProviderUnavailableError("Provider credentials are not configured");
      if(!cfg.baseUrl || !cfg.model) throw new ProviderUnavailableError("Provider configuration is incomplete");
      const response=await fetch(cfg.baseUrl+"/chat/completions",{
        method:"POST",
        headers:{"content-type":"application/json","authorization:"Bearer "+credential},
        body:JSON.stringify({model:cfg.model,messages:input.messages||[],temperature:input.temperature})
      });
      if(!response.ok){
        const body=await response.text();
        throw new ProviderUnavailableError("Provider request failed: HTTP "+response.status+" "+body.slice(0,500));
      }
      return await response.json();
    }
  };
}
