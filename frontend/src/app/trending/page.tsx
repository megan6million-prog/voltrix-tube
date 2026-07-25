"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import api from "@/lib/api";
import { Content } from "@/types";
import { useState } from "react";

const TABS = ["Trending", "Movies", "Comedy", "Music", "Sports", "Gaming", "Education", "Ugandan"];

export default function TrendingPage() {
  const [activeTab, setActiveTab] = useState("Trending");

  const { data, isLoading } = useQuery({
    queryKey: ["trending-full", activeTab],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "24" };
      if (activeTab !== "Trending") params.category = activeTab;
      const res = await api.get("/content/trending", { params });
      return res.data.data;
    },
  });

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-4">🔥 Trending</h1>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-white text-black" : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {data?.items?.map((c: Content, i: number) => (
              <div key={c.id} className="relative">
                {i < 3 && (
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-sm font-bold z-10">
                    #{i + 1}
                  </div>
                )}
                <VideoCard content={c} />
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
