"use client";
import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { Radio, Copy, CheckCircle } from "lucide-react";

export default function GoLivePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [streamType, setStreamType] = useState("regular");
  const [ppvPrice, setPpvPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamData, setStreamData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");

  const STREAM_TYPES = [
    { id: "regular", label: "Regular", icon: "📹" },
    { id: "gaming", label: "Gaming", icon: "🎮" },
    { id: "sports", label: "Sports", icon: "⚽" },
    { id: "movie_premiere", label: "Premiere", icon: "🎬" },
  ];

  const handleCreate = async () => {
    if (!title) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/streams", {
        title,
        description,
        stream_type: streamType,
        ppv_price_ugx: ppvPrice ? parseInt(ppvPrice) : undefined,
      });
      setStreamData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create stream");
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (streamData) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">Stream Ready!</h1>
            <p className="text-gray-400 text-sm mt-1">Add these settings to OBS to go live</p>
          </div>

          <div className="space-y-4">
            {[
              { label: "RTMP Server", value: streamData.rtmp_endpoint, key: "rtmp" },
              { label: "Stream Key", value: streamData.stream_key, key: "key", sensitive: true },
            ].map(({ label, value, key, sensitive }) => (
              <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">{label}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-green-400 break-all">
                    {sensitive ? "••••••••••••••••" : value}
                  </code>
                  <button onClick={() => copyToClipboard(value, key)}
                    className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {copied === key ? <CheckCircle size={16} className="text-green-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
            <p className="font-semibold mb-1">OBS Setup:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Open OBS → Settings → Stream</li>
              <li>Service: Custom</li>
              <li>Server: paste RTMP Server above</li>
              <li>Stream Key: paste Stream Key above</li>
              <li>Click Start Streaming</li>
            </ol>
          </div>

          <button onClick={() => api.post(`/streams/${streamData.stream_id}/start`)}
            className="w-full mt-6 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <Radio size={18} />
            I'm Live — Start Stream
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Go Live</h1>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Stream Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What are you streaming?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Stream Type</label>
            <div className="grid grid-cols-2 gap-2">
              {STREAM_TYPES.map(({ id, label, icon }) => (
                <button key={id} onClick={() => setStreamType(id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors ${
                    streamType === id ? "bg-white text-black font-semibold" : "bg-white/10 hover:bg-white/20"
                  }`}>
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Tell viewers what to expect..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">PPV Price (UGX) — optional</label>
            <input type="number" value={ppvPrice} onChange={e => setPpvPrice(e.target.value)}
              placeholder="Leave blank for free stream"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
            />
          </div>

          <button onClick={handleCreate} disabled={!title || loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
            <Radio size={18} />
            {loading ? "Creating stream..." : "Create Stream"}
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
