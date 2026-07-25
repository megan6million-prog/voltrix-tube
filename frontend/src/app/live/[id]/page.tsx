"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { formatUGX, timeAgo } from "@/lib/utils";
import { Send, Users, Heart } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function LivePage() {
  const { id } = useParams<{ id: string }>();
  const [chatMsg, setChatMsg] = useState("");
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: stream } = useQuery({
    queryKey: ["stream", id],
    queryFn: async () => {
      const res = await api.get(`/streams/${id}`);
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const { data: chatData } = useQuery({
    queryKey: ["stream-chat", id],
    queryFn: async () => {
      const res = await api.get(`/streams/${id}/chat?limit=50`);
      return res.data.data;
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (chatData?.messages) setChatMessages(chatData.messages);
  }, [chatData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatMsg.trim()) return;
    try {
      await api.post(`/streams/${id}/chat`, { message: chatMsg });
      setChatMsg("");
    } catch {}
  };

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <div className="flex flex-col xl:flex-row gap-4">

          {/* Player + info */}
          <div className="flex-1 min-w-0">
            {/* Player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-4 relative">
              {stream?.playback_url ? (
                <video src={stream.playback_url} autoPlay controls className="w-full h-full" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl">📡</span>
                  </div>
                  <p>{stream?.status === "scheduled" ? "Stream hasn't started yet" : "Stream ended"}</p>
                </div>
              )}

              {/* Live badge */}
              {stream?.status === "live" && (
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                    🔴 LIVE
                  </span>
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Users size={10} /> {stream.viewer_count || 0}
                  </span>
                </div>
              )}
            </div>

            {/* Stream info */}
            <h1 className="text-xl font-bold mb-2">{stream?.title}</h1>
            {stream?.ppv_price_ugx && (
              <div className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full mb-3">
                💰 PPV — {formatUGX(stream.ppv_price_ugx)}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm transition-colors">
                <Heart size={14} />
                Like
              </button>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-sm transition-colors">
                Share
              </button>
            </div>
          </div>

          {/* Live Chat */}
          <div className="xl:w-80 flex flex-col bg-white/5 border border-white/10 rounded-2xl overflow-hidden h-[500px] xl:h-auto">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Live Chat
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-gray-500 text-xs text-center mt-8">No messages yet. Say something!</p>
              )}
              {chatMessages.map((msg: any, i: number) => (
                <div key={i} className="text-sm">
                  {msg.is_tip && (
                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-2 mb-1">
                      <span className="text-yellow-400 font-bold text-xs">
                        💰 Tipped {formatUGX(msg.tip_amount_ugx)}
                      </span>
                    </div>
                  )}
                  <span className="text-blue-400 font-medium">@user </span>
                  <span className="text-gray-300">{msg.message}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-white/10">
              <div className="flex gap-2">
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendChat()}
                  placeholder="Say something..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-white/30 placeholder-gray-500"
                />
                <button onClick={sendChat} disabled={!chatMsg.trim()}
                  className="w-9 h-9 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
