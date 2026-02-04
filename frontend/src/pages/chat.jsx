import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logo.jpg";
import "../styles/website.css";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const suggestions = [
    "What are my rights if I signed a contract?",
    "How do I file a complaint?",
    "Can I get legal aid?",
  ];

  const sendMessage = async (text) => {
    const userMessage = text ?? message;
    if (!userMessage) return;

    setLoading(true);

    // Add user message to history
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    if (!text) setMessage("");

    try {
      // Build prompt with the system persona already in your server.js
      const prompt = `System: You are UbuntuBot, a Lawyer Assistant specialized in South African law. Provide helpful, jurisdiction-specific but non-binding info, end with: "This information is for general guidance..." \n\nUser: ${userMessage}\nAssistant:`;

      // Send request to backend, which calls Hugging Face securely
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Server error ${res.status}: ${text}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, { role: "bot", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      <div className="container">
        <div className="chat-card">
          <div className="chat-header">
            <div className="chat-brand">
              <img src={logo} alt="UbuntuBot Logo" className="chat-logo" />
              <div className="chat-title-wrap">
                <h2>UbuntuBot</h2>
                <p className="small-text">Quick legal guidance — ready when you are</p>
                 <p className="disclaimer">Disclaimer: UbuntuBot provides general legal information and is not a substitute for professional legal advice.</p>
              </div>
            </div>

            <div className="chat-actions">
              <button
                className="suggest-toggle"
                title="Toggle suggestions"
                onClick={() => setShowSuggestions((s) => !s)}
              >
                💡
              </button>
              <Link to="/" className="chat-close" title="Go back">
                Close
              </Link>
            </div>
          </div>

          {showSuggestions && (
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="suggestion"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="messages">
            {messages.length === 0 && (
              <p className="muted">Ask me anything about your legal situation... or try one of the suggestions above.</p>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <div className="message-text">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="chat-controls">
            <textarea
              className="chat-input"
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask your legal question..."
            />
            <button className="btn-cta" onClick={() => sendMessage()} disabled={loading}>
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
