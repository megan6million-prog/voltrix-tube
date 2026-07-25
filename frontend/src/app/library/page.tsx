"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import VideoCard from "@/components/video/VideoCard";
import api from "@/lib/api";
import { Content } from "@/types";
import { History, Trash2 } from "lucide-react";

export default function LibraryPage() {
  const { data: historyData, refetch } = useQuery({
    queryKey: ["watch-history"],
    queryFn: async () => {
      const res = await api.get("/users/me/watch-history?limit=24");
      return res.data.data;
    },
  });

  const { data: savedData } = useQuery({
    queryKey: ["saved"],
    queryFn: async () => {
      const res = await api.get("/users/me/saved?limit=24");
      return res.data.data;
    },
  });

  const { data: purchasesData } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const res = await api.get("/users/me/purchases?limit=12");
      return res.data.data;
    },
  });

  const clearHistory = async () => {
    await api.delete("/users/me/watch-history");
    refetch();
  };

  return (
    <MainLayout>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Library</h1>

        {/* Watch History */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <History size={18} className="text-gray-400" />
              Watch History
            </h2>
            {historyData?.items?.length > 0 && (
              <button onClick={clearHistory}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-400 transition-colors">
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
          {!historyData?.items?.length ? (
            <p className="text-gray-500 text-sm">No watch history yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {historyData.items.map((c: Content) => <VideoCard key={c.id} content={c} />)}
            </div>
          )}
        </section>

        {/* Saved Videos */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">🔖 Saved</h2>
          {!savedData?.items?.length ? (
            <p className="text-gray-500 text-sm">No saved videos yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedData.items.map((c: Content) => <VideoCard key={c.id} content={c} />)}
            </div>
          )}
        </section>

        {/* Purchases */}
        <section>
          <h2 className="text-lg font-semibold mb-4">🛒 Purchases</h2>
          {!purchasesData?.items?.length ? (
            <p className="text-gray-500 text-sm">No purchases yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {purchasesData.items.map((p: any) => (
                <div key={p.id} className="relative">
                  {p.content && <VideoCard content={p.content} />}
                  <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full font-bold capitalize">
                    {p.purchase_type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
