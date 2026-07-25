"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import api from "@/lib/api";
import { Channel, Content } from "@/types";
import { formatViews } from "@/lib/utils";
import { CheckCircle2, Bell, UserPlus } from "lucide-react";
import { useState } from "react";

export default function ChannelPage() {
  const { handle } = useParams<{ handle: string }>();
  const [subscribed, setSubscribed] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel", handle],
    queryFn: async () => {
      const res = await api.get(`/channels/${handle}`);
      return res.data.data as Channel;
    },
  });

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["channel-videos", handle],
    queryFn: async () => {
      const res = await api.get(`/content/feed?limit=20`);
      return res.data.data;
    },
    enabled: !!channel,
  });

  const handleSubscribe = async () => {
    try {
      if (subscribed) {
        await api.delete(`/channels/${handle}/subscribe`);
      } else {
        await api.post(`/channels/${handle}/subscribe`);
      }
      setSubscribed(!subscribed);
    } catch {}
  };

  if (isLoading) return (
    <MainLayout>
      <div className="animate-pulse">
        <div className="h-40 bg-white/5 mb-4" />
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-white/10 mb-4" />
          <div className="h-6 w-48 bg-white/10 rounded mb-2" />
          <div className="h-4 w-32 bg-white/10 rounded" />
        </div>
      </div>
    </MainLayout>
  );

  if (!channel) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64 text-gray-500">Channel not found</div>
    </MainLayout>
  );

  return (
    <MainLayout>
      {/* Banner */}
      <div className="h-40 bg-gradient-to-r from-red-900/40 to-purple-900/40 relative">
        {channel.banner_url && (
          <img src={channel.banner_url} alt="banner" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="max-w-screen-xl mx-auto px-4">
        {/* Channel info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-10 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-purple-600 border-4 border-[#0f0f0f] flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {channel.channel_name?.charAt(0)}
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{channel.channel_name}</h1>
              {channel.is_verified && <CheckCircle2 size={20} className="text-blue-400" />}
            </div>
            <p className="text-gray-400 text-sm">@{channel.handle}</p>
            <p className="text-gray-400 text-sm mt-1">
              {formatViews(channel.subscriber_count)} subscribers
            </p>
          </div>
          <div className="flex gap-2 pb-2">
            {subscribed && (
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-full text-sm transition-colors">
                <Bell size={14} />
              </button>
            )}
            <button
              onClick={handleSubscribe}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                subscribed
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              {subscribed ? "Subscribed" : (
                <><UserPlus size={14} /> Subscribe</>
              )}
            </button>
          </div>
        </div>

        {/* Description */}
        {channel.description && (
          <p className="text-gray-400 text-sm mb-6 max-w-2xl">{channel.description}</p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-6">
          {["videos", "playlists", "about"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "videos" && (
          videosLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
              {videosData?.items?.map((c: Content) => <VideoCard key={c.id} content={c} />)}
            </div>
          )
        )}

        {activeTab === "about" && (
          <div className="max-w-lg pb-8">
            <div className="bg-white/5 rounded-xl p-5 space-y-3 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Channel</p>
                <p>{channel.channel_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Handle</p>
                <p>@{channel.handle}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Subscribers</p>
                <p>{formatViews(channel.subscriber_count)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
