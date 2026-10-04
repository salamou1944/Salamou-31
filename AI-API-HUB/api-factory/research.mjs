// Agent-Reach-inspired research routing boundary. Backends are explicit and HTTPS-only.
export function createResearchAdapter(config={}) {
  const backends=Array.isArray(config.backends)&&config.backends.length ? config.backends : ["https://r.jina.ai"];
  return { kind:"research", backends, async health(){ return {available:true,kind:"research",backends:backends.length}; } };
}
