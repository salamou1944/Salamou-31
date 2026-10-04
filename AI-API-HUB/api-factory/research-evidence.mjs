const DEFAULT_DAYS = 30;
const MAX_DAYS = 3650;

function asDate(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) throw new Error(field+" must be a valid date");
  return date;
}

function canonicalizeUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("evidence URL must use http or https");
  if (url.username || url.password) throw new Error("evidence URL must not contain credentials");
  url.hash = "";
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

export function buildEvidenceLedger(results, options = {}) {
  if (!Array.isArray(results)) throw new Error("evidence results must be an array");
  const days = options.days ?? DEFAULT_DAYS;
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw new Error("evidence window must be 1..3650 days");
  }

  const now = asDate(options.now ?? new Date().toISOString(), "now");
  const cutoff = new Date(now.getTime() - days * 86400000);
  const seen = new Set();
  const entries = [];

  for (const item of results) {
    if (!item || typeof item !== "object") throw new Error("each evidence result must be an object");
    if (typeof item.source !== "string" || !item.source.trim()) throw new Error("evidence source is required");
    if (typeof item.url !== "string") throw new Error("evidence URL is required");

    const url = canonicalizeUrl(item.url);
    if (seen.has(url)) continue;
    seen.add(url);

    const publishedAt = item.publishedAt ? asDate(item.publishedAt, "publishedAt") : null;
    const freshness = !publishedAt
      ? "undated"
      : publishedAt > now
        ? "future"
        : publishedAt >= cutoff
          ? "fresh"
          : "stale";

    entries.push({
      source: item.source.trim(),
      url,
      title: typeof item.title === "string" ? item.title.trim() : "",
      publishedAt: publishedAt?.toISOString() ?? null,
      retrievedAt: now.toISOString(),
      freshness,
      relevance: Number.isFinite(item.relevance) ? item.relevance : null,
      engagement: Number.isFinite(item.engagement) ? item.engagement : null
    });
  }

  const fresh = entries.filter(entry => entry.freshness === "fresh");
  const sources = [...new Set(fresh.map(entry => entry.source))];

  return {
    kind: "research-evidence-ledger",
    windowDays: days,
    cutoff: cutoff.toISOString(),
    retrievedAt: now.toISOString(),
    total: entries.length,
    fresh: fresh.length,
    sources,
    entries
  };
}

export function requireFreshEvidence(ledger, minimum = 1) {
  if (!ledger || ledger.kind !== "research-evidence-ledger") {
    throw new Error("invalid research evidence ledger");
  }
  if (!Number.isInteger(minimum) || minimum < 1) throw new Error("minimum must be >= 1");
  if (ledger.fresh < minimum) {
    throw new Error("insufficient fresh evidence");
  }
  return ledger;
}
