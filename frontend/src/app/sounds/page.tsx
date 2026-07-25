"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { formatViews, timeAgo } from "@/lib/utils";
import { Music2, Play, Heart, TrendingUp } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["All", "Trending", "Afrobeat", "Gospel", "Local Ugandan", "Comedy", "Instrumental", "Kids"];

export default function SoundsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [playing, setPlaying] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["sounds", activeCategory],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "30" };
      if (activeCategory !== "All") params.category = activeCategory;
      const res = await api.get("/sounds", { params });
      return res.data.data;
    },
  });

  const { data: trending } = useQuery({
    queryKey: ["sounds-trending"],
    queryFn: async () => {
      const res = await api.get("/sounds/trending?limit=5");
      return res.data.data;
    },
  });

  const handleSave = async (soundId: string) => {
    try {
      await api.post(`/sounds/${soundId}/save`);
    } catch {}
  };

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🎵 Sounds</h1>
            <p className="text-gray-400 text-sm mt-1">Audio tracks for your videos and shorts</p>
          </div>
        </div>

        {/* Trending sounds */}
        {trending?.sounds?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-red-400" />
              Trending Sounds
            </h2>
            <div className="space-y-2">
              {trending.sounds.map((sound: any, i: number) => (
                <div key={sound.id}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors">
                  <span className="text-2xl font-bold text-gray-600 w-6 text-center">{i + 1}</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Music2 size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sound.title}</p>
                    <p className="text-xs text-gray-400">{sound.artist_name || "Unknown artist"}</p>
                  </div>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    {formatViews(sound.usage_count || 0)} uses
                  </p>
                  <button
                    onClick={() => setPlaying(playing === sound.id ? null : sound.id)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors flex-shrink-0">
                    <Play size={14} className={playing === sound.id ? "text-green-400" : ""} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat ? "bg-white text-black" : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* All sounds grid */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.sounds?.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Music2 size={48} className="mx-auto mb-4 opacity-30" />
            <p>No sounds yet in this category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.sounds?.map((sound: any) => (
              <div key={sound.id}
                className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition-colors group">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Music2 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sound.title}</p>
                  <p className="text-xs text-gray-400">
                    {sound.artist_name || "Original"} · {formatViews(sound.usage_count || 0)} uses
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleSave(sound.id)}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                    <Heart size={14} />
                  </button>
                  <button
                    onClick={() => setPlaying(playing === sound.id ? null : sound.id)}
                    className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center transition-colors">
                    <Play size={14} fill="currentColor" />
                  </button>
                </div>
                {playing === sound.id && sound.audio_url && (
                  <audio src={sound.audio_url} autoPlay
                    onEnded={() => setPlaying(null)} className="hidden" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
