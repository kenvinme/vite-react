"use strict";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const BODY_SIZE_LIMIT = 64 * 1024;
const MAX_MESSAGE_LENGTH = 4000;
const OPENAI_TIMEOUT_MS = 20000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = globalThis.__piChatRateLimitStore || new Map();

globalThis.__piChatRateLimitStore = rateLimitStore;

function json(res, statusCode, payload, extraHeaders = {}) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  Object.entries(extraHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.end(JSON.stringify(payload));
}

function getClientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return String(
    req.headers["x-real-ip"]
      || req.socket?.remoteAddress
      || req.connection?.remoteAddress
      || "unknown"
  ).trim();
}

function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

function isOriginAllowed(origin) {
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "").trim();
  if (!allowedOrigins) return true;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  return allowedOrigins
    .split(",")
    .map((item) => normalizeOrigin(item))
    .filter(Boolean)
    .includes(normalizedOrigin);
}

function getCorsHeaders(req) {
  const origin = String(req.headers.origin || "").trim();
  if (!origin || !isOriginAllowed(origin)) {
    return {
      Vary: "Origin"
    };
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin"
  };
}

function checkRateLimit(ip) {
  const now = Date.now();
  const current = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > current.resetAt) {
    const fresh = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(ip, fresh);
    return { ok: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: fresh.resetAt };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { ok: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  rateLimitStore.set(ip, current);
  return { ok: true, remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count), resetAt: current.resetAt };
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;
      if (Buffer.byteLength(data, "utf8") > BODY_SIZE_LIMIT) {
        const err = new Error("Payload too large");
        err.statusCode = 413;
        req.destroy(err);
      }
    });

    req.on("end", () => {
      try {
        const jsonBody = JSON.parse(data || "{}");
        resolve(jsonBody);
      } catch (error) {
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function buildSystemPrompt() {
  return [
    "Bạn là YumzyBot, trợ lý bán hàng và CSKH của Yumzyfood tại Việt Nam.",
    "Mục tiêu của bạn là trả lời như một nhân viên tư vấn giỏi, tự nhiên, rõ ràng, thân thiện và đáng tin.",
    "Luôn ưu tiên trả lời bằng tiếng Việt, trừ khi khách hỏi bằng tiếng khác.",
    "Tập trung tư vấn về sản phẩm KCANS và năng lực sản xuất của Yumzyfood.",
    "Nhấn mạnh đúng lúc các điểm mạnh: chiên hiện đại, đóng gói tự động, chuẩn HACCP.",
    "Nếu khách hỏi báo giá, MOQ, mẫu thử, đại lý, phân phối hoặc mua hàng, hãy chủ động hướng khách đến form báo giá, Zalo và số điện thoại trên website.",
    "Không bịa thông tin về giá, thành phần, chứng nhận hoặc chính sách nếu chưa có dữ liệu.",
    "Nếu thiếu dữ liệu, hãy nói rõ là cần khách để lại thông tin hoặc liên hệ trực tiếp để đội ngũ hỗ trợ.",
    "Ưu tiên câu trả lời ngắn gọn, nhưng vẫn đủ ý và có tính tư vấn.",
    "Khi phù hợp, hãy kết thúc bằng một lời mời hành động nhẹ nhàng như để lại nhu cầu, số lượng, hoặc liên hệ báo giá."
  ].join("\n");
}

function sanitizeMessage(input) {
  const text = String(input || "").trim();
  if (!text) return "";
  return text.replace(/\s+/g, " ").slice(0, MAX_MESSAGE_LENGTH);
}

async function callOpenAI(message) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("Missing OPENAI_API_KEY");
    err.statusCode = 500;
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(errorText || `OpenAI request failed with status ${response.status}`);
      err.statusCode = response.status;
      throw err;
    }

    const data = await response.json();
    return String(data?.choices?.[0]?.message?.content || "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

function mapErrorToReply(error) {
  const statusCode = Number(error?.statusCode || 500) || 500;
  const message = String(error?.message || "");

  if (statusCode === 400) {
    return {
      statusCode: 400,
      body: { error: "Invalid JSON body hoặc dữ liệu gửi lên không hợp lệ." }
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      statusCode: 500,
      body: { reply: "Xin lỗi, chatbot đang gặp lỗi cấu hình xác thực. Bạn vui lòng thử lại sau nhé." }
    };
  }

  if (statusCode === 413) {
    return {
      statusCode: 413,
      body: { error: "Nội dung câu hỏi quá dài." }
    };
  }

  if (statusCode === 429 || /rate limit|quota/i.test(message)) {
    return {
      statusCode: 429,
      body: { reply: "Xin lỗi, chatbot đang bận do có quá nhiều yêu cầu cùng lúc. Bạn thử lại sau ít phút nhé." }
    };
  }

  if (/abort|timeout/i.test(message)) {
    return {
      statusCode: 504,
      body: { reply: "Xin lỗi, chatbot phản hồi hơi chậm. Bạn vui lòng thử lại giúp mình nhé." }
    };
  }

  return {
    statusCode: 500,
    body: { reply: "Xin lỗi, hệ thống AI đang gặp lỗi kết nối. Bạn vui lòng thử lại sau." }
  };
}

module.exports = async (req, res) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return json(res, 204, {}, corsHeaders);
  }

  if (!isOriginAllowed(req.headers.origin || "")) {
    return json(res, 403, { error: "Origin not allowed" }, corsHeaders);
  }

  if (req.method !== "POST") {
    return json(res, 405, { error: "Method Not Allowed" }, corsHeaders);
  }

  const clientIp = getClientIp(req);
  const rate = checkRateLimit(clientIp);
  if (!rate.ok) {
    return json(
      res,
      429,
      { reply: "Bạn đang gửi yêu cầu hơi nhanh. Vui lòng chờ một chút rồi thử lại nhé." },
      {
        ...corsHeaders,
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(rate.resetAt)
      }
    );
  }

  try {
    const body = await readJsonBody(req);
    const message = sanitizeMessage(body?.message);

    if (!message) {
      return json(res, 400, { error: "Missing 'message' in body" }, corsHeaders);
    }

    const reply = await callOpenAI(message);
    return json(
      res,
      200,
      {
        reply: reply || "Xin lỗi, mình chưa có câu trả lời phù hợp. Bạn có thể nói rõ hơn một chút nhé."
      },
      {
        ...corsHeaders,
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(rate.resetAt)
      }
    );
  } catch (error) {
    console.error("pi-chat server error:", error);
    const mapped = mapErrorToReply(error);
    return json(res, mapped.statusCode, mapped.body, corsHeaders);
  }
};
