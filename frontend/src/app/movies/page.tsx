"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import api from "@/lib/api";
import { Content } from "@/types";
import { useState } from "react";
import { formatUGX } from "@/lib/utils";

const GENRES = ["All", "Drama", "Comedy", "Action", "Romance", "Horror", "Documentary", "Nollywood", "Ugandan", "Animation"];

export default function MoviesPage() {
  const [genre, setGenre] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["movies", genre],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (genre !== "All") params.genre = genre;
      const res = await api.get("/content/movies", { params });
      return res.data.data;
    },
  });

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-red-900/40 to-purple-900/40 p-8 mb-8">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Now Available</p>
            <h1 className="text-3xl font-bold mb-2">Movies & Series</h1>
            <p className="text-gray-300 text-sm mb-4">Ugandan films, Nollywood hits, and international cinema</p>
            <div className="flex gap-3">
              <button className="bg-white text-black font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                ▶ Browse All
              </button>
              <button className="bg-white/10 hover:bg-white/20 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                🎬 New Releases
              </button>
            </div>
          </div>
        </div>

        {/* Genre filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          {GENRES.map(g => (
            <button key={g} onClick={() => setGenre(g)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                genre === g ? "bg-white text-black" : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}>
              {g}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data?.items?.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No movies yet</p>
            <p className="text-sm mt-1">Check back soon for new releases</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {data?.items?.map((c: Content) => (
              <div key={c.id} className="group">
                <VideoCard content={c} />
                {(c.rental_price_ugx || c.purchase_price_ugx) && (
                  <div className="flex gap-1 mt-2">
                    {c.rental_price_ugx && (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                        Rent {formatUGX(c.rental_price_ugx)}
                      </span>
                    )}
                    {c.purchase_price_ugx && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        Buy {formatUGX(c.purchase_price_ugx)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
