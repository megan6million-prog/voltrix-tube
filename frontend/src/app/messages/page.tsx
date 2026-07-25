"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { timeAgo, formatUGX } from "@/lib/utils";
import { Send, MessageCircle, Users, Megaphone } from "lucide-react";

export default function MessagesPage() {
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const qc = useQueryClient();

  const { data: convsData } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/messages/conversations");
      return res.data.data;
    },
  });

  const { data: msgsData } = useQuery({
    queryKey: ["messages", activeConv],
    queryFn: async () => {
      if (!activeConv) return null;
      const res = await api.get(`/messages/conversations/${activeConv}/messages?limit=50`);
      return res.data.data;
    },
    enabled: !!activeConv,
    refetchInterval: 3000, // poll every 3s until WebSocket is added
  });

  const sendMsg = useMutation({
    mutationFn: (body: string) =>
      api.post(`/messages/conversations/${activeConv}/messages`, { message_type: "text", body }),
    onSuccess: () => {
      setMessage("");
      qc.invalidateQueries({ queryKey: ["messages", activeConv] });
    },
  });

  const convs = convsData?.conversations || [];
  const msgs = msgsData?.messages || [];
  const activeConvData = convs.find((c: any) => c.id === activeConv);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-64px)]">

        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r border-white/10 flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold">Messages</h1>
              <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <MessageCircle size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                <MessageCircle size={40} className="mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start a conversation with a creator or friend</p>
              </div>
            ) : (
              convs.map((conv: any) => (
                <button key={conv.id} onClick={() => setActiveConv(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${
                    activeConv === conv.id ? "bg-white/10" : ""
                  }`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center font-bold flex-shrink-0">
                    {conv.conversation_type === "group" ? <Users size={16} /> :
                     conv.conversation_type === "broadcast" ? <Megaphone size={16} /> :
                     conv.title?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{conv.title || "Conversation"}</p>
                      {conv.last_message_at && (
                        <p className="text-xs text-gray-500 flex-shrink-0">{timeAgo(conv.last_message_at)}</p>
                      )}
                    </div>
                    {conv.last_message_preview && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{conv.last_message_preview}</p>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className={`flex-1 flex flex-col ${activeConv ? "flex" : "hidden md:flex"}`}>
          {!activeConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p>Select a conversation</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="h-14 border-b border-white/10 flex items-center px-4 gap-3">
                <button onClick={() => setActiveConv(null)} className="md:hidden p-1">←</button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {activeConvData?.title?.charAt(0) || "?"}
                </div>
                <p className="font-medium">{activeConvData?.title || "Conversation"}</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgs.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                      msg.is_mine
                        ? "bg-red-600 text-white rounded-br-sm"
                        : "bg-white/10 text-white rounded-bl-sm"
                    }`}>
                      {/* Shared content card */}
                      {msg.shared_content_id && (
                        <div className="bg-white/10 rounded-xl p-3 mb-2 text-xs">
                          <p className="font-medium">🎬 Shared video</p>
                          <p className="text-gray-300 mt-1">Tap to watch</p>
                        </div>
                      )}
                      {/* Tip message */}
                      {msg.tip_amount_ugx && (
                        <div className="flex items-center gap-1 text-yellow-400 mb-1 text-xs font-bold">
                          💰 Tipped {formatUGX(msg.tip_amount_ugx)}
                        </div>
                      )}
                      {msg.body && <p>{msg.body}</p>}
                      <p className={`text-xs mt-1 ${msg.is_mine ? "text-red-200" : "text-gray-500"}`}>
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && message.trim() && sendMsg.mutate(message)}
                    placeholder="Type a message..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder-gray-500"
                  />
                  <button
                    onClick={() => message.trim() && sendMsg.mutate(message)}
                    disabled={!message.trim() || sendMsg.isPending}
                    className="w-10 h-10 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-full flex items-center justify-center transition-colors flex-shrink-0">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
