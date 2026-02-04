import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { marked } from "marked";
import logo from "../assets/images/logo.jpg";
import "../styles/website.css";

// Small helper functions ported from previously working Chatbot class
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeHtml(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const dangerousTags = ["script", "iframe", "object", "embed", "form", "input", "button"];
  const dangerousAttributes = ["onclick", "onload", "onerror", "onmouseover", "onfocus", "onblur"];

  dangerousTags.forEach((tag) => {
    const els = tempDiv.querySelectorAll(tag);
    els.forEach((el) => el.remove());
  });

  const all = tempDiv.querySelectorAll("*");
  all.forEach((el) => {
    dangerousAttributes.forEach((attr) => {
      if (el.hasAttribute(attr)) el.removeAttribute(attr);
    });
  });

  return tempDiv.innerHTML;
}

// Configure marked renderer (custom table, code, links)
const renderer = new marked.Renderer();
renderer.table = (header, body) =>
  `<div class="table-container"><table class="markdown-table"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
renderer.link = (href, title, text) => {
  try {
    const urlObj = new URL(href);
    const target = urlObj.protocol.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
    const safeHref = href;
    return `<a href="${safeHref}"${target}${title ? ` title="${title}"` : ""}>${text}</a>`;
  } catch (e) {
    return `<a href="#">${text}</a>`;
  }
};
renderer.code = (code, language) => {
  const lang = language ? ` class="language-${language}"` : "";
  return `<pre><code${lang}>${escapeHtml(code)}</code></pre>`;
};
renderer.codespan = (code) => `<code>${escapeHtml(code)}</code>`;
marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false, sanitize: false });
marked.use({ renderer });

const STORAGE_KEY = "ubuntuLawBotHistory";

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]); // {role: 'user'|'assistant'|'system', text, ts}
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messageCount, setMessageCount] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const messageRef = useRef(null);
  const messagesRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  const suggestions = [
    "What are my rights if I signed a contract?",
    "How do I file a complaint?",
    "Can I get legal aid?",
  ];

  useEffect(() => {
    // Load last chat or start a new one
    const h = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (h && h.length > 0) {
      const last = h[0];
      if (last && last.messages && last.messages.length > 0) {
        setMessages(last.messages);
        setMessageCount(last.messages.length);
        return;
      }
    }

    // Create an initial welcome message
    const welcome = {
      role: "assistant",
      text: "Hello! I'm Ubuntu Law Bot, your AI legal assistant. I can help you understand your rights, explain procedures, and give general guidance. How can I assist you today?",
      ts: new Date().toISOString(),
    };
    setMessages([welcome]);
    setMessageCount(1);
  }, []);

  useEffect(() => {
    // auto-scroll
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    saveChatToHistory();
  }, [messages]);

  function autoResizeTextarea() {
    const ta = messageRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const computed = window.getComputedStyle(ta);
    const minHeight = parseFloat(computed.minHeight) || 0;
    const maxHeight = isFinite(parseFloat(computed.maxHeight)) ? parseFloat(computed.maxHeight) : Infinity;
    const target = Math.min(Math.max(ta.scrollHeight, minHeight), maxHeight);
    ta.style.height = `${target}px`;
  }

  function addMessageToState(text, role = "assistant") {
    const msg = { role, text, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, msg]);
    setMessageCount((c) => c + 1);
  }

  async function sendMessage(text) {
    const userMessage = (text ?? message).trim();
    if (!userMessage || isTyping) return;

    // Hide suggestions after first message
    if (showSuggestions) setShowSuggestions(false);

    // Add user message locally
    addMessageToState(userMessage, "user");
    setMessage("");
    autoResizeTextarea();

    // Show typing indicator
    setIsTyping(true);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const textErr = await res.text().catch(() => "");
        throw new Error(`Server error ${res.status}: ${textErr}`);
      }

      const data = await res.json();
      const reply = data.reply || data.message || "(no reply)";

      addMessageToState(reply, "assistant");
    } catch (err) {
      console.error("API Error:", err);
      addMessageToState(`Sorry, I encountered an error: ${err.message}`, "assistant");
    } finally {
      setIsTyping(false);
      setLoading(false);
    }
  }

  function saveChatToHistory() {
    if (messages.length === 0) return;
    const chatData = {
      id: messages[0]?.ts || Date.now().toString(),
      title: messages[0]?.text?.substring(0, 30) || "New Chat",
      messages: [...messages],
      timestamp: new Date().toISOString(),
      preview: messages[messages.length - 1]?.text?.substring(0, 100) + "...",
    };

    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    history = history.filter((c) => c.id !== chatData.id);
    history.unshift(chatData);
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  function loadChat(id) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const chat = history.find((c) => c.id === id);
    if (!chat) return;
    setMessages(chat.messages);
    setMessageCount(chat.messages.length);
    setHistoryOpen(false);
  }

  function clearAllHistory() {
    if (confirm("Are you sure you want to clear all chat history? This action cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]);
      setMessageCount(0);
    }
  }

  function formatBotResponse(content) {
    try {
      let html = marked.parse(content || "");
      // simple styling replacements
      html = html
        .replace(/⚠️\s*(.*?)(?=<br>|<\/p>|$)/g, '<div class="legal-warning">$1</div>')
        .replace(/💡\s*(.*?)(?=<br>|<\/p>|$)/g, '<div class="legal-tip">$1</div>')
        .replace(/📚\s*(.*?)(?=<br>|<\/p>|$)/g, '<div class="legal-resource">$1</div>')
        .replace(/<li>(\d+\.\s*)(.*?)<\/li>/g, '<li class="legal-step">$1$2</li>');

      return sanitizeHtml(html);
    } catch (e) {
      console.error("Markdown parsing error:", e);
      return escapeHtml(content);
    }
  }

  function formatDate(ts) {
    const date = new Date(ts);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString();
  }

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
              <button className="suggest-toggle" title="Toggle suggestions" onClick={() => setShowSuggestions((s) => !s)}>💡</button>
              <button className="chat-history-toggle" onClick={() => setHistoryOpen((h) => !h)} title="Toggle history">📚</button>
              <Link to="/" className="chat-close" title="Go back">Close</Link>
            </div>
          </div>

          {showSuggestions && (
            <div className="suggestions starter-tiles" id="starterTiles">
              <h3>Quick Start - Common Legal Questions:</h3>
              <div className="tile-grid">
                <div className="starter-tile" data-message="What are my basic rights when dealing with law enforcement?" onClick={() => sendMessage("What are my basic rights when dealing with law enforcement?")}> <div className="tile-icon">👮</div><div className="tile-text">Police Rights</div></div>
                <div className="starter-tile" data-message="What should I do if I receive a legal notice or summons?" onClick={() => sendMessage("What should I do if I receive a legal notice or summons?")}> <div className="tile-icon">📋</div><div className="tile-text">Legal Notices</div></div>
                <div className="starter-tile" data-message="How do I protect my rights during a workplace dispute?" onClick={() => sendMessage("How do I protect my rights during a workplace dispute?")}> <div className="tile-icon">💼</div><div className="tile-text">Workplace Rights</div></div>
                <div className="starter-tile" data-message="What are my rights as a tenant or property owner?" onClick={() => sendMessage("What are my rights as a tenant or property owner?")}> <div className="tile-icon">🏠</div><div className="tile-text">Property Rights</div></div>
                <div className="starter-tile" data-message="How do I handle small claims court procedures?" onClick={() => sendMessage("How do I handle small claims court procedures?")}> <div className="tile-icon">⚖️</div><div className="tile-text">Small Claims</div></div>
                <div className="starter-tile" data-message="What are my consumer rights when dealing with companies?" onClick={() => sendMessage("What are my consumer rights when dealing with companies?")}> <div className="tile-icon">🛒</div><div className="tile-text">Consumer Rights</div></div>
              </div>
            </div>
          )}

          <div className="messages" ref={messagesRef}>
            {messages.length === 0 && <p className="muted">Ask me anything about your legal situation... or try one of the suggestions above.</p>}

            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role === 'assistant' ? 'bot' : m.role}`}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: m.role === 'assistant' ? formatBotResponse(m.text) : escapeHtml(m.text) }} />
                <div className="message-meta"><span className="message-timestamp">{formatDate(m.ts)}</span></div>
              </div>
            ))}

            {isTyping && (
              <div className="message bot typing-indicator" id="typingIndicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
          </div>

          <div className="chat-controls">
            <textarea
              ref={messageRef}
              className="chat-input"
              rows="2"
              value={message}
              onChange={(e) => { setMessage(e.target.value); autoResizeTextarea(); }}
              placeholder="Ask your legal question..."
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <button className="btn-cta" onClick={() => sendMessage()} disabled={loading}>{loading ? 'Thinking...' : 'Send'}</button>
          </div>

        </div>

        {/* History Sidebar */}
        <div className={`history-sidebar ${historyOpen ? 'open' : ''}`}>
          <div className="history-header">
            <h3>Chat History</h3>
            <button onClick={() => setHistoryOpen(false)}>Close</button>
          </div>
          <div className="history-list">
            {JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').length === 0 && <div className="no-history">No chat history yet</div>}
            {JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').map((chat) => (
              <div key={chat.id} className={`history-item ${chat.id === messages[0]?.ts ? 'active' : ''}`} onClick={() => loadChat(chat.id)}>
                <div className="history-item-title">{chat.title}</div>
                <div className="history-item-preview">{chat.preview}</div>
                <div className="history-item-date">{formatDate(chat.timestamp)}</div>
              </div>
            ))}
            <div className="history-footer">
              <button className="clear-history" onClick={clearAllHistory}>Clear All</button>
            </div>
          </div>
        </div>

        <button className="new-chat-btn" onClick={() => { if (confirm('Start a new chat?')) { setMessages([]); setMessageCount(0); } }}>New Chat</button>
      </div>
    </div>
  );
};

export default Chat;
