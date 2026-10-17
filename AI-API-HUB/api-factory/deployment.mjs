const ENV_BY_TARGET={
  railway:["RAILWAY_TOKEN"],
  vercel:["VERCEL_TOKEN","VERCEL_ORG_ID","VERCEL_PROJECT_ID"]
};

// A credential check is not a deploy implementation. Keep this fail-closed until
// a provider adapter actually creates the service, waits for a deployment, and
// verifies its externally reachable endpoint.
const ADAPTER_IMPLEMENTED_BY_TARGET={
  railway:false,
  vercel:false
};

export function deploymentPlan({target="none",serviceName}={}){
  if(!serviceName||typeof serviceName!=="string") throw new Error("serviceName is required");
  if(!Object.hasOwn(ENV_BY_TARGET,target)) throw new Error("unsupported deployment target");
  const requiredEnv=ENV_BY_TARGET[target];
  const missing=requiredEnv.filter(key=>!process.env[key]);
  const credentialsReady=missing.length===0;
  const adapterImplemented=ADAPTER_IMPLEMENTED_BY_TARGET[target]===true;
  const blockers=[
    ...missing,
    ...(!adapterImplemented?["DEPLOYMENT_ADAPTER_NOT_IMPLEMENTED"]:[])
  ];
  return {
    target,
    serviceName,
    deployable:credentialsReady&&adapterImplemented,
    credentialsReady,
    adapterImplemented,
    executionAvailable:adapterImplemented,
    requiredEnv,
    missing,
    blockers,
    reason:!credentialsReady
      ?"deployment credentials are not configured"
      :!adapterImplemented
        ?"credentials are present; target execution adapter is not implemented"
        :"credentials and deployment adapter are ready"
  };
}
