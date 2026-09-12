import Fastify from "fastify";
import cors from "@fastify/cors";
import OpenAI from "openai";
import crypto from "node:crypto";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const serviceApiKeys = new Set(
  (process.env.SERVICE_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
);
const maxRequestsPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE || 20);
const requestLog = new Map();

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isAuthorized(request) {
  const provided = request.headers["x-api-key"];
  if (!provided || serviceApiKeys.size === 0) return false;
  return [...serviceApiKeys].some((key) => safeEqual(provided, key));
}

function rateLimit(request) {
  const key = request.headers["x-api-key"] || request.ip;
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (requestLog.get(key) || []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= maxRequestsPerMinute) return false;
  recent.push(now);
  requestLog.set(key, recent);
  return true;
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    short_description: { type: "string" },
    description: { type: "string" },
    selling_points: { type: "array", items: { type: "string" } },
    ad_copy: { type: "string" },
    cta: { type: "string" },
    audience: { type: "string" },
    cautions: { type: "array", items: { type: "string" } }
  },
  required: [
    "title",
    "short_description",
    "description",
    "selling_points",
    "ad_copy",
    "cta",
    "audience",
    "cautions"
  ]
};

app.get("/health", async () => ({
  ok: true,
  service: "ai-product-content-api",
  model,
  authentication: serviceApiKeys.size > 0 ? "api-key" : "not-configured"
}));

app.post("/v1/product-content", async (request, reply) => {
  if (!isAuthorized(request)) {
    return reply.code(401).send({ error: "Unauthorized" });
  }

  if (!rateLimit(request)) {
    return reply.code(429).send({ error: "Rate limit exceeded" });
  }

  const body = request.body || {};
  const productName = String(body.product_name || "").trim();
  const productDetails = String(body.product_details || "").trim();
  const language = String(body.language || "English").trim();
  const imageUrl = body.image_url ? String(body.image_url).trim() : null;

  if (!productName && !productDetails && !imageUrl) {
    return reply.code(400).send({
      error: "Provide product_name, product_details, or image_url"
    });
  }

  const prompt = `Create sales-ready product content in ${language}.\n\nProduct name: ${productName || "Unknown"}\nProduct details supplied by seller: ${productDetails || "None"}\n\nRules:\n- Never invent specifications, materials, dimensions, certifications, guarantees, prices, medical claims, or features.\n- If something important is unknown, leave it out and mention it in cautions.\n- Keep the output persuasive but factual.\n- Write for a business selling this product online.\n- Return only the requested structured fields.`;

  try {
    const client = getClient();
    const content = [{ type: "input_text", text: prompt }];
    if (imageUrl) content.push({ type: "input_image", image_url: imageUrl });

    const response = await client.responses.create({
      model,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "product_content",
          strict: true,
          schema
        }
      }
    });

    return {
      ok: true,
      model,
      result: JSON.parse(response.output_text)
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: "Generation failed",
      message: error?.message || "Unknown error"
    });
  }
});

app.listen({ port, host: "0.0.0.0" });
