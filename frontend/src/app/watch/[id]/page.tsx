"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { Content } from "@/types";
import { formatViews, formatDuration, timeAgo, formatUGX } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Share2, Bookmark, Flag, Lock, Play } from "lucide-react";
import VideoCard from "@/components/video/VideoCard";
import { useState } from "react";
import { useAppStore } from "@/store/app.store";

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppStore();
  const [commentText, setCommentText] = useState("");

  const { data: contentData, isLoading } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const res = await api.get(`/content/${id}`);
      return res.data.data as Content;
    },
  });

  const { data: playbackData } = useQuery({
    queryKey: ["playback", id],
    queryFn: async () => {
      const res = await api.get(`/content/${id}/playback`);
      return res.data.data;
    },
    enabled: !!contentData,
    retry: false,
  });

  const { data: commentsData } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const res = await api.get(`/content/${id}/comments?limit=20`);
      return res.data.data;
    },
  });

  const { data: relatedData } = useQuery({
    queryKey: ["related", contentData?.category],
    queryFn: async () => {
      const res = await api.get(`/content/feed?limit=10`);
      return res.data.data;
    },
    enabled: !!contentData,
  });

  const handleLike = () => api.post(`/content/${id}/react`, { reaction: "like" }).catch(() => {});
  const handleShare = () => api.post(`/content/${id}/share`, { destination: "copy_link", share_type: "full" }).catch(() => {});

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 max-w-screen-xl mx-auto">
          <div className="aspect-video bg-white/5 rounded-2xl animate-pulse mb-4" />
          <div className="h-6 bg-white/5 rounded w-2/3 animate-pulse mb-2" />
          <div className="h-4 bg-white/5 rounded w-1/3 animate-pulse" />
        </div>
      </MainLayout>
    );
  }

  if (!contentData) return (
    <MainLayout>
      <div className="flex items-center justify-center h-64 text-gray-500">Content not found</div>
    </MainLayout>
  );

  const isGated = !playbackData?.hls_url && (contentData.ppv_price_ugx || contentData.rental_price_ugx);

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex flex-col xl:flex-row gap-6">

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Video player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden mb-4 relative">
              {isGated ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                  <Lock size={48} className="text-yellow-400 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Premium Content</h3>
                  <p className="text-gray-400 text-sm mb-6">Purchase to watch</p>
                  <div className="flex gap-3">
                    {contentData.rental_price_ugx && (
                      <button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-2.5 rounded-xl transition-colors">
                        Rent — {formatUGX(contentData.rental_price_ugx)}
                      </button>
                    )}
                    {contentData.purchase_price_ugx && (
                      <button className="bg-white hover:bg-gray-100 text-black font-semibold px-6 py-2.5 rounded-xl transition-colors">
                        Buy — {formatUGX(contentData.purchase_price_ugx)}
                      </button>
                    )}
                  </div>
                </div>
              ) : playbackData?.hls_url ? (
                <video
                  src={playbackData.hls_url}
                  controls
                  autoPlay
                  className="w-full h-full"
                  onPlay={() => api.post(`/content/${id}/view`, { watched_seconds: 0, completion_pct: 0 }).catch(() => {})}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-gray-500">
                    <Play size={48} className="mx-auto mb-2 opacity-50" />
                    <p>{contentData.processing_status === "pending" ? "Video is processing..." : "Video unavailable"}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Title and actions */}
            <h1 className="text-xl font-bold mb-3">{contentData.title}</h1>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{formatViews(contentData.view_count)} views</span>
                <span>·</span>
                <span>{contentData.published_at ? timeAgo(contentData.published_at) : ""}</span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleLike}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-sm transition-colors">
                  <ThumbsUp size={16} />
                  <span>{formatViews(contentData.like_count)}</span>
                </button>
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-sm transition-colors">
                  <ThumbsDown size={16} />
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-sm transition-colors">
                  <Share2 size={16} />
                  <span>Share</span>
                </button>
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-sm transition-colors">
                  <Bookmark size={16} />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Channel info */}
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center font-bold">
                  {contentData.channel?.channel_name?.charAt(0) || "V"}
                </div>
                <div>
                  <p className="font-medium">{contentData.channel?.channel_name}</p>
                  <p className="text-xs text-gray-400">
                    {formatViews(contentData.channel?.subscriber_count || 0)} subscribers
                  </p>
                </div>
              </div>
              <button className="bg-white text-black font-semibold px-5 py-2 rounded-full text-sm hover:bg-gray-200 transition-colors">
                Subscribe
              </button>
            </div>

            {/* Description */}
            {contentData.description && (
              <div className="bg-white/5 rounded-xl p-4 mb-6 text-sm text-gray-300 leading-relaxed">
                {contentData.description}
              </div>
            )}

            {/* Comments */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {formatViews(contentData.comment_count)} Comments
              </h2>

              {user && (
                <div className="flex gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-sm font-bold">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full bg-transparent border-b border-white/20 focus:border-white/50 pb-2 text-sm outline-none placeholder-gray-500"
                    />
                    {commentText && (
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setCommentText("")}
                          className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-full">
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            api.post(`/content/${id}/comments`, { body: commentText }).catch(() => {});
                            setCommentText("");
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-sm px-4 py-1.5 rounded-full transition-colors">
                          Comment
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {commentsData?.comments?.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center text-xs font-bold">
                      U
                    </div>
                    <div>
                      <p className="text-sm font-medium">User</p>
                      <p className="text-sm text-gray-300 mt-0.5">{comment.body}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{timeAgo(comment.created_at)}</span>
                        <button className="flex items-center gap-1 hover:text-white">
                          <ThumbsUp size={12} /> {comment.like_count}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — related videos */}
          <div className="xl:w-96 space-y-4">
            <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wider">Up Next</h3>
            {relatedData?.items
              ?.filter((c: Content) => c.id !== id)
              ?.slice(0, 8)
              ?.map((c: Content) => (
                <VideoCard key={c.id} content={c} />
              ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
