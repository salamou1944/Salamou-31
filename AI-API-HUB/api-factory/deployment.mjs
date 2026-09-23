const ENV_BY_TARGET={
  railway:["RAILWAY_TOKEN"],
  vercel:["VERCEL_TOKEN","VERCEL_ORG_ID","VERCEL_PROJECT_ID"]
};

export function deploymentPlan({target="none",serviceName}={}){
  if(!serviceName||typeof serviceName!=="string") throw new Error("serviceName is required");
  if(!Object.hasOwn(ENV_BY_TARGET,target)) throw new Error("unsupported deployment target");
  const requiredEnv=ENV_BY_TARGET[target];
  const missing=requiredEnv.filter(key=>!process.env[key]);
  return {
    target,
    serviceName,
    deployable:missing.length===0,
    requiredEnv,
    missing,
    reason:missing.length?"deployment credentials are not configured":"credentials present; deployment execution requires target adapter"
  };
}
