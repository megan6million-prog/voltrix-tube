"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { formatViews } from "@/lib/utils";
import Link from "next/link";
import { Radio, Users } from "lucide-react";

export default function GamingPage() {
  const { data: liveData } = useQuery({
    queryKey: ["gaming-live"],
    queryFn: async () => {
      const res = await api.get("/streams/live?category=gaming&limit=12");
      return res.data.data;
    },
  });

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">🎮 Gaming</h1>
            <p className="text-gray-400 text-sm mt-1">Live streams and gaming content</p>
          </div>
          <Link href="/studio/live"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Radio size={14} />
            Go Live
          </Link>
        </div>

        {/* Live now */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live Now
          </h2>
          {liveData?.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/5 rounded-2xl">
              <Radio size={32} className="mx-auto mb-3 opacity-30" />
              <p>No gaming streams live right now</p>
              <Link href="/studio/live"
                className="inline-block mt-3 text-sm text-red-400 hover:text-red-300">
                Start streaming →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveData?.map((stream: any) => (
                <Link key={stream.id} href={`/live/${stream.id}`}
                  className="group bg-white/5 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-colors">
                  <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-blue-900/30 relative">
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold">
                      LIVE
                    </span>
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded px-1.5 py-0.5 text-xs">
                      <Users size={10} />
                      {formatViews(stream.viewer_count || 0)}
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-1">{stream.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{stream.stream_type}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* How to stream */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-white/10 rounded-2xl p-6">
          <h2 className="font-semibold mb-2">Stream on Voltrix</h2>
          <p className="text-gray-400 text-sm mb-4">Use OBS or any streaming software to go live on Voltrix.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { step: "1", desc: "Go to Creator Studio → Go Live" },
              { step: "2", desc: "Copy your stream key" },
              { step: "3", desc: "Paste into OBS and start streaming" },
            ].map(({ step, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                  {step}
                </div>
                <p className="text-gray-300">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
