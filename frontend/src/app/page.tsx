"use client";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Content } from "@/types";
import { useState } from "react";

const CATEGORIES = ["All", "Trending", "Movies", "Sports", "Gaming", "Education", "Music", "Comedy", "News", "Ugandan"];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: feedData, isLoading } = useQuery({
    queryKey: ["feed", activeCategory],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeCategory !== "All") params.content_type = activeCategory.toLowerCase();
      const res = await api.get("/content/feed", { params });
      return res.data.data;
    },
  });

  const { data: trendingData } = useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const res = await api.get("/content/trending?limit=6");
      return res.data.data;
    },
  });

  const { data: liveData } = useQuery({
    queryKey: ["live"],
    queryFn: async () => {
      const res = await api.get("/streams/live?limit=4");
      return res.data.data;
    },
  });

  const items: Content[] = feedData?.items || [];

  return (
    <MainLayout>
      <div className="px-4 py-6 max-w-screen-2xl mx-auto">

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-white text-black"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Now */}
        {liveData?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live Now
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {liveData.map((stream: any) => (
                <a key={stream.id} href={`/live/${stream.id}`}
                  className="group block bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
                  <div className="aspect-video bg-red-900/20 flex items-center justify-center relative">
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold">
                      LIVE
                    </span>
                    <span className="text-gray-500 text-sm">{stream.stream_type}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-1">{stream.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{stream.viewer_count || 0} watching</p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Trending */}
        {trendingData?.items?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">🔥 Trending in Uganda</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {trendingData.items.map((content: Content) => (
                <VideoCard key={content.id} content={content} />
              ))}
            </div>
          </section>
        )}

        {/* Main Feed */}
        <section>
          <h2 className="text-lg font-semibold mb-4">
            {activeCategory === "All" ? "Recommended For You" : activeCategory}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-500">
              <p className="text-lg">No content yet</p>
              <p className="text-sm mt-1">Be the first to upload!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((content: Content) => (
                <VideoCard key={content.id} content={content} />
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
