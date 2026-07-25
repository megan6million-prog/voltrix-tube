"use client";
import { Content } from "@/types";
import { formatViews, formatDuration, timeAgo, truncate } from "@/lib/utils";
import Link from "next/link";
import { Play, Lock } from "lucide-react";

interface Props {
  content: Content;
}

export default function VideoCard({ content }: Props) {
  const isGated = content.visibility === "ppv" || content.visibility === "members_only";

  return (
    <Link href={`/watch/${content.id}`} className="group block">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-white/5 rounded-xl overflow-hidden mb-3">
        {content.thumbnail_url ? (
          <img
            src={content.thumbnail_url}
            alt={content.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            <Play size={32} className="text-gray-600" />
          </div>
        )}

        {/* Duration badge */}
        {content.duration_seconds && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
            {formatDuration(content.duration_seconds)}
          </span>
        )}

        {/* Gated overlay */}
        {isGated && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-black/70 rounded-full p-2">
              <Lock size={20} className="text-yellow-400" />
            </div>
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
            <Play size={24} className="text-white fill-white" />
          </div>
        </div>

        {/* PPV price badge */}
        {content.ppv_price_ugx && (
          <span className="absolute top-2 left-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-semibold">
            UGX {content.ppv_price_ugx.toLocaleString()}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
          {content.channel?.channel_name?.charAt(0) || "V"}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">
            {truncate(content.title, 80)}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {content.channel?.channel_name || "Voltrix Creator"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatViews(content.view_count)} views
            {content.published_at && ` · ${timeAgo(content.published_at)}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
