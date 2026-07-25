"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import SkeletonCard from "@/components/shared/SkeletonCard";
import api from "@/lib/api";
import { Content } from "@/types";
import { BookOpen, Star } from "lucide-react";
import Link from "next/link";

export default function EducationPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["education"],
    queryFn: async () => {
      const res = await api.get("/content/feed?content_type=video&limit=20");
      return res.data.data;
    },
  });

  const { data: collections } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => {
      const res = await api.get("/collections?limit=8");
      return res.data.data;
    },
  });

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">📚 Education</h1>
            <p className="text-gray-400 text-sm mt-1">Courses, lessons and tutorials</p>
          </div>
          <Link href="/studio/upload"
            className="bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition-colors">
            + Upload Lesson
          </Link>
        </div>

        {/* Paid collections / courses */}
        {collections?.items?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-400" />
              Courses & Schools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {collections.items.map((c: any) => (
                <Link key={c.id} href={`/collection/${c.id}`}
                  className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl overflow-hidden transition-colors">
                  <div className="aspect-video bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center">
                    <BookOpen size={32} className="text-blue-400 opacity-50" />
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-sm line-clamp-2">{c.title}</p>
                    {c.institution_name && (
                      <p className="text-xs text-gray-400 mt-1">{c.institution_name}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 text-xs text-yellow-400">
                        <Star size={10} fill="currentColor" />
                        <span>{c.rating?.toFixed(1) || "New"}</span>
                      </div>
                      <span className="text-xs text-blue-400 font-medium">
                        {c.price_ugx ? `UGX ${c.price_ugx.toLocaleString()}` : "Free"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Free education videos */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Free Lessons</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {data?.items?.map((c: Content) => <VideoCard key={c.id} content={c} />)}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
