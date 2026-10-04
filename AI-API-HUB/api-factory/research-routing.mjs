const HTTPS=/^https:\/\//;
const MAX_URL=4096;

export function createResearchRoute(config={}) {
  const backends=(Array.isArray(config.backends)&&config.backends.length?config.backends:["https://r.jina.ai"])
    .filter(x=>typeof x==="string"&&HTTPS.test(x))
    .map(x=>x.replace(/\/$/,""));
  if(!backends.length) throw new Error("research routing requires at least one HTTPS backend");
  return {
    kind:"research-route",
    backends,
    plan(target){
      if(typeof target!=="string"||target.length<1||target.length>MAX_URL) throw new Error("target URL must be 1..4096 chars");
      const url=new URL(target);
      if(!["http:","https:"].includes(url.protocol)) throw new Error("target URL must use http or https");
      if(url.username||url.password) throw new Error("target URL must not contain credentials");
      return {
        target:url.toString(),
        attempts:backends.map((backend,index)=>({
          priority:index+1,
          backend,
          request:backend+"/"+url.toString()
        }))
      };
    }
  };
}
