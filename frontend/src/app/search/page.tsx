"use client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import api from "@/lib/api";
import { Content } from "@/types";
import { Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);

  useEffect(() => { setQuery(searchParams.get("q") || ""); }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", initialQ],
    queryFn: async () => {
      if (!initialQ) return null;
      const res = await api.get(`/search?q=${encodeURIComponent(initialQ)}&limit=24`);
      return res.data.data;
    },
    enabled: !!initialQ,
  });

  const handleNotifyMe = async () => {
    // POST to missing content followers endpoint
    alert("We'll notify you when this content is available!");
  };

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Search bar (mobile) */}
        <div className="flex md:hidden mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && router.push(`/search?q=${encodeURIComponent(query)}`)}
            placeholder="Search..."
            className="flex-1 bg-white/5 border border-white/10 rounded-l-full px-5 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder-gray-500"
          />
          <button onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
            className="bg-white/10 border border-l-0 border-white/10 rounded-r-full px-4">
            <Search size={18} />
          </button>
        </div>

        {!initialQ ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Search size={48} className="mb-4 opacity-30" />
            <p>Search for videos, movies, creators, sounds</p>
          </div>
        ) : isLoading ? (
          <div>
            <p className="text-gray-400 text-sm mb-6">Searching for "{initialQ}"...</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        ) : data?.results?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={48} className="mb-4 opacity-30" />
            <h2 className="text-xl font-semibold mb-2">No results for "{initialQ}"</h2>
            {data?.missing_content_prompt && (
              <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 max-w-md">
                <Bell size={24} className="mx-auto mb-3 text-blue-400" />
                <p className="text-gray-300 text-sm mb-4">{data.missing_content_prompt}</p>
                <button onClick={handleNotifyMe}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors">
                  Yes, notify me
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-gray-400 text-sm mb-6">
              {data.total || data.results.length} results for "{initialQ}"
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.results.map((content: Content) => (
                <VideoCard key={content.id} content={content} />
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<MainLayout><div className="p-8 text-gray-400">Loading search...</div></MainLayout>}>
      <SearchContent />
    </Suspense>
  );
}
