import React, { useState, useRef, useEffect, FormEvent } from "react";
import "./ChatWidget.css";

type Sender = "user" | "bot";

interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
}

const initialBotMessage: ChatMessage = {
  id: "init",
  sender: "bot",
  text: "Xin chào 👋 Mình là YumzyBot, trợ lý snack KCANS của Yumzyfood. Bạn cần tư vấn gì hôm nay?",
};

const quickReplies = [
  "Giới thiệu về Yumzyfood",
  "Thông tin sản phẩm KCANS",
  "Báo giá & MOQ",
  "Thông tin HACCP & nhà máy",
];

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialBotMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Tự cuộn xuống cuối mỗi khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const addMessage = (sender: Sender, text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        sender,
        text,
      },
    ]);
  };

  const callApi = async (content: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!res.ok) {
        throw new Error("Network error");
      }

      const data = await res.json();
      const reply: string =
        data.reply || "Xin lỗi, YumzyBot chưa có câu trả lời phù hợp.";
      addMessage("bot", reply);
    } catch (err) {
      console.error(err);
      addMessage(
        "bot",
        "Xin lỗi, hệ thống đang bận hoặc lỗi kết nối. Bạn vui lòng thử lại sau nhé 🙏"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    addMessage("user", text);
    setInput("");
    void callApi(text);
  };

  const handleQuickReply = (text: string) => {
    if (loading) return;
    addMessage("user", text);
    void callApi(text);
  };

  return (
    <div className="yz-chatbot">
      {/* Nút tròn ở góc màn hình */}
      <button
        className="yz-chatbot-toggle"
        aria-label="Chat với YumzyBot"
        onClick={() => setIsOpen((o) => !o)}
      >
        💬
      </button>

      {/* Cửa sổ chat */}
      {isOpen && (
        <div className="yz-chatbot-window">
          <div className="yz-header">
            <div className="yz-header-title">
              <strong>YumzyBot</strong>
              <span>Hỗ trợ snack KCANS & Yumzyfood</span>
            </div>
            <button
              className="yz-chatbot-close"
              aria-label="Đóng"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="yz-chatbot-messages">
            <div className="yz-quick-replies">
              {quickReplies.map((q) => (
                <button key={q} onClick={() => handleQuickReply(q)}>
                  {q}
                </button>
              ))}
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                className={`yz-msg ${
                  m.sender === "user" ? "yz-user" : "yz-bot"
                }`}
                dangerouslySetInnerHTML={{ __html: m.text }}
              />
            ))}

            {loading && (
              <div className="yz-msg yz-bot">
                YumzyBot đang suy nghĩ… 🤔
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="yz-chatbot-form" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
