"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { formatUGX } from "@/lib/utils";
import { BookOpen, Play, Lock, CheckCircle, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState("");

  const { data: collection } = useQuery({
    queryKey: ["collection", id],
    queryFn: async () => {
      const res = await api.get(`/collections/${id}`);
      return res.data.data;
    },
  });

  const { data: lessonsData } = useQuery({
    queryKey: ["collection-lessons", id],
    queryFn: async () => {
      const res = await api.get(`/collections/${id}/lessons`);
      return res.data.data;
    },
    enabled: !!collection,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["collection-reviews", id],
    queryFn: async () => {
      const res = await api.get(`/collections/${id}/reviews?limit=5`);
      return res.data.data;
    },
    enabled: !!collection,
  });

  const handleEnroll = async () => {
    setEnrolling(true);
    setMessage("");
    try {
      await api.post(`/collections/${id}/enroll`, { payment_source: "wallet" });
      setEnrolled(true);
      setMessage("✅ Enrolled successfully! Start learning now.");
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Enrollment failed");
    }
    setEnrolling(false);
  };

  if (!collection) return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-2/3 mb-4" />
        <div className="h-4 bg-white/5 rounded w-1/2 mb-8" />
        <div className="h-48 bg-white/5 rounded-2xl" />
      </div>
    </MainLayout>
  );

  const lessons = lessonsData?.lessons || [];
  const userProgress = lessonsData?.user_progress || {};
  const isEnrolled = enrolled || collection.user_enrollment_status === "active";

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full capitalize">
                {collection.collection_type}
              </span>
              {collection.is_accredited && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  ✓ Accredited
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-2">{collection.title}</h1>
            {collection.institution_name && (
              <p className="text-gray-400 text-sm mb-2">
                🏫 {collection.institution_name}
              </p>
            )}
            <p className="text-gray-300 text-sm mb-4">{collection.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <BookOpen size={14} />
                {collection.total_lessons} lessons
              </span>
              <span className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400" fill="currentColor" />
                {collection.rating?.toFixed(1) || "New"} ({collection.total_ratings || 0})
              </span>
              <span>{collection.enrollment_count || 0} enrolled</span>
            </div>
          </div>

          {/* Enrollment card */}
          <div className="lg:w-72 bg-white/5 border border-white/10 rounded-2xl p-5 flex-shrink-0">
            <div className="text-center mb-4">
              {collection.pricing_model === "one_time" ? (
                <>
                  <p className="text-3xl font-bold">{formatUGX(collection.price_ugx || 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">One-time payment</p>
                </>
              ) : collection.pricing_model === "subscription" ? (
                <>
                  <p className="text-3xl font-bold">{formatUGX(collection.subscription_price_ugx || 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">per {collection.subscription_period}</p>
                </>
              ) : (
                <p className="text-3xl font-bold text-green-400">Free</p>
              )}
            </div>

            {message && (
              <p className={`text-sm text-center mb-3 ${message.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                {message}
              </p>
            )}

            {isEnrolled ? (
              <div>
                <div className="flex items-center justify-center gap-2 text-green-400 mb-3">
                  <CheckCircle size={18} />
                  <span className="text-sm font-medium">Enrolled</span>
                </div>
                {lessons[0] && (
                  <Link href={`/watch/${lessons[0].content_id}`}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl text-sm font-semibold transition-colors">
                    <Play size={16} />
                    Continue Learning
                  </Link>
                )}
              </div>
            ) : (
              <button onClick={handleEnroll} disabled={enrolling}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold transition-colors">
                {enrolling ? "Enrolling..." : collection.pricing_model === "free" ? "Enroll Free" : "Enroll Now"}
              </button>
            )}

            {collection.certificate_on_complete && (
              <p className="text-xs text-center text-gray-400 mt-3">
                🏆 Certificate on completion
              </p>
            )}
            {(collection.free_preview_lessons || 0) > 0 && !isEnrolled && (
              <p className="text-xs text-center text-blue-400 mt-2">
                First {collection.free_preview_lessons} lessons free
              </p>
            )}
          </div>
        </div>

        {/* Lessons list */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            Lessons ({lessons.length})
          </h2>
          <div className="space-y-2">
            {lessons.map((lesson: any, i: number) => {
              const isAccessible = isEnrolled || lesson.is_free_preview;
              const isCompleted = userProgress[lesson.id]?.is_completed;
              return (
                <div key={lesson.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    isAccessible
                      ? "bg-white/5 border-white/10 hover:border-white/20 cursor-pointer"
                      : "bg-white/3 border-white/5 opacity-60"
                  }`}
                  onClick={() => isAccessible && lesson.content_id &&
                    window.location.assign(`/watch/${lesson.content_id}`)}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    isCompleted ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-400"
                  }`}>
                    {isCompleted ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{lesson.title || `Lesson ${i + 1}`}</p>
                    {lesson.duration_seconds && (
                      <p className="text-xs text-gray-500">
                        {Math.ceil(lesson.duration_seconds / 60)} min
                      </p>
                    )}
                  </div>
                  {!isAccessible && <Lock size={14} className="text-gray-600 flex-shrink-0" />}
                  {lesson.is_free_preview && !isEnrolled && (
                    <span className="text-xs text-green-400 flex-shrink-0">Free</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Reviews */}
        {reviewsData?.reviews?.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Reviews ({collection.total_ratings || 0})
            </h2>
            <div className="space-y-4">
              {reviewsData.reviews.map((r: any) => (
                <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12}
                          className={i < r.rating ? "text-yellow-400" : "text-gray-600"}
                          fill={i < r.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                    {r.is_verified_purchase && (
                      <span className="text-xs text-green-400">✓ Verified</span>
                    )}
                  </div>
                  {r.review_text && <p className="text-sm text-gray-300">{r.review_text}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
