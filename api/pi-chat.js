// api/pi-chat.js
// Vercel Serverless Function – chatbot YumzyBot dùng OpenAI

// Hàm đọc body JSON từ request (vì đây là Node thuần, không phải Next.js)
async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        const json = JSON.parse(data || "{}");
        resolve(json);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const message = (body.message || "").toString();

    if (!message) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Missing 'message' in body" }));
      return;
    }

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `
Bạn là YumzyBot, trợ lý bán hàng & CSKH của nhà sản xuất snack Yumzyfood tại Việt Nam.

- Giải thích về sản phẩm KCANS rõ ràng, dễ hiểu.
- Nhấn mạnh: chiên hiện đại, đóng gói tự động, chuẩn HACCP.
- Hướng khách đến form báo giá, Zalo, điện thoại trên website.
- Ưu tiên trả lời tiếng Việt, ngắn gọn, thân thiện.
              `.trim(),
            },
            { role: "user", content: message },
          ],
          temperature: 0.6,
        }),
      }
    );

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("OpenAI error:", errorText);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          reply:
            "Xin lỗi, hệ thống AI đang bận hoặc gặp sự cố. Bạn vui lòng thử lại sau nhé.",
        })
      );
      return;
    }

    const data = await openaiRes.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Xin lỗi, mình chưa có câu trả lời phù hợp.";

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        reply:
          "Xin lỗi, hệ thống AI đang gặp lỗi kết nối. Bạn vui lòng thử lại sau.",
      })
    );
  }
};
