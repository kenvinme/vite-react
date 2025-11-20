// api/pi-chat.js
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing 'message' in body" });
    return;
  }

  try {
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
- Hướng khách đến form báo giá, Zalo, điện thoại.
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
      res.status(500).json({
        reply:
          "Xin lỗi, hệ thống AI đang bận hoặc gặp sự cố. Bạn vui lòng thử lại sau nhé.",
      });
      return;
    }

    const data = await openaiRes.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Xin lỗi, mình chưa có câu trả lời phù hợp.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({
      reply:
        "Xin lỗi, hệ thống AI đang gặp lỗi kết nối. Bạn vui lòng thử lại sau.",
    });
  }
};
