"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store/app.store";
import api from "@/lib/api";
import { Bot, X, Send, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  content_results?: any[];
}

const QUICK_ACTIONS = [
  { label: "What to watch?", message: "Recommend me something to watch based on my taste" },
  { label: "My earnings", message: "How much have I earned this month?" },
  { label: "Wallet help", message: "How do I top up my wallet?" },
  { label: "Upload help", message: "How do I upload a video?" },
];

export default function AIDrawer() {
  const { aiDrawerOpen, setAiDrawerOpen, user } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create session on first open
  useEffect(() => {
    if (aiDrawerOpen && !sessionId) {
      api.post("/ai/sessions", { context: "general" })
        .then(res => setSessionId(res.data.data.session_id))
        .catch(() => {});

      // Welcome message
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `Hi${user?.username ? ` @${user.username}` : ""}! 👋 I can help you find content, check your earnings, manage your wallet, or answer any questions about Voltrix. What do you need?`,
      }]);
    }
  }, [aiDrawerOpen]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post(`/ai/sessions/${sessionId}/message`, { message: msg });
      const { reply, content_results } = res.data.data;
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply || "I'm not sure about that. Try asking something else.",
        content_results,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
      }]);
    }
    setLoading(false);
  };

  if (!aiDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setAiDrawerOpen(false)} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-[#111] border-l border-white/10 flex flex-col z-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">Voltrix AI</p>
              <p className="text-xs text-gray-400">Always here to help</p>
            </div>
          </div>
          <button onClick={() => setAiDrawerOpen(false)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Sparkles size={10} />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-red-600 text-white rounded-br-sm"
                  : "bg-white/10 text-white rounded-bl-sm"
              }`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Content result cards */}
                {msg.content_results?.map((c: any) => (
                  <a key={c.id} href={`/watch/${c.id}`}
                    className="flex items-center gap-3 mt-3 bg-white/10 rounded-xl p-2 hover:bg-white/20 transition-colors">
                    <div className="w-12 h-8 bg-white/10 rounded-lg flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">{c.content_type}</p>
                    </div>
                  </a>
                ))}

                {/* Feedback */}
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => api.post(`/ai/messages/${msg.id}/feedback`, { feedback: "helpful" }).catch(() => {})}
                      className="text-gray-500 hover:text-green-400 transition-colors">
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => api.post(`/ai/messages/${msg.id}/feedback`, { feedback: "unhelpful" }).catch(() => {})}
                      className="text-gray-500 hover:text-red-400 transition-colors">
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex-shrink-0 mr-2 mt-1" />
              <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick actions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <p className="text-xs text-gray-500 mb-2">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(({ label, message }) => (
                <button key={label} onClick={() => sendMessage(message)}
                  className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask me anything..."
              disabled={!sessionId}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder-gray-500 disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading || !sessionId}
              className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 hover:opacity-90 disabled:opacity-50 rounded-full flex items-center justify-center transition-opacity flex-shrink-0">
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
