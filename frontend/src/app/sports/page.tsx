"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import api from "@/lib/api";
import { Content } from "@/types";
import { Tv, Calendar } from "lucide-react";
import Link from "next/link";
import { formatUGX } from "@/lib/utils";

export default function SportsPage() {
  const { data: liveData } = useQuery({
    queryKey: ["sports-live"],
    queryFn: async () => {
      const res = await api.get("/streams/live?category=sports&limit=6");
      return res.data.data;
    },
  });

  const { data: upcomingData } = useQuery({
    queryKey: ["sports-upcoming"],
    queryFn: async () => {
      const res = await api.get("/streams/live?limit=8");
      return res.data.data;
    },
  });

  const { data: videosData } = useQuery({
    queryKey: ["sports-videos"],
    queryFn: async () => {
      const res = await api.get("/content/trending?category=Sports&limit=12");
      return res.data.data;
    },
  });

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-green-900/40 to-blue-900/40 p-8 mb-8">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">⚽ Sports</p>
            <h1 className="text-3xl font-bold mb-2">Live Matches & Highlights</h1>
            <p className="text-gray-300 text-sm mb-4">Uganda Premier League, FUFA, and more</p>
            <div className="flex gap-3">
              <Link href="/studio/live"
                className="bg-red-600 hover:bg-red-700 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2">
                🔴 Go Live
              </Link>
              <button className="bg-white/10 hover:bg-white/20 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                📅 Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Live now */}
        {liveData?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live Now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveData.map((stream: any) => (
                <Link key={stream.id} href={`/live/${stream.id}`}
                  className="group bg-white/5 border border-white/10 hover:border-red-500/30 rounded-xl overflow-hidden transition-colors">
                  <div className="aspect-video bg-gradient-to-br from-green-900/30 to-blue-900/30 relative flex items-center justify-center">
                    <Tv size={32} className="text-gray-600" />
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold animate-pulse">
                      LIVE
                    </span>
                    {stream.ppv_price_ugx && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded font-bold">
                        {formatUGX(stream.ppv_price_ugx)}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm">{stream.title}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {stream.viewer_count || 0} watching
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* No live — FUFA promo */}
        {(!liveData || liveData.length === 0) && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚽</div>
              <div>
                <h3 className="font-semibold mb-1">Uganda Premier League</h3>
                <p className="text-gray-400 text-sm mb-3">
                  No matches live right now. Follow your favourite teams and get notified when they play.
                </p>
                <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                  Browse Teams
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sports highlights */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Sports Highlights & Analysis</h2>
          {videosData?.items?.length === 0 ? (
            <p className="text-gray-500 text-sm">No sports content yet. Be the first to upload!</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {videosData?.items?.map((c: Content) => <VideoCard key={c.id} content={c} />)}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
