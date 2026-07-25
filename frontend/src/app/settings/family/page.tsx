"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import Link from "next/link";
import { useState } from "react";
import { Plus, Shield, Clock, Eye, Lock } from "lucide-react";

export default function FamilyPage() {
  const qc = useQueryClient();
  const [showLink, setShowLink] = useState(false);
  const [childUsername, setChildUsername] = useState("");
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState("");

  const { data: familyData } = useQuery({
    queryKey: ["family"],
    queryFn: async () => {
      const res = await api.get("/family/members");
      return res.data.data;
    },
  });

  const handleLinkChild = async () => {
    setLinking(true);
    setMessage("");
    try {
      await api.post("/family/link-child", { child_username_or_phone: childUsername });
      setMessage("Invitation sent! The child will need to confirm.");
      setShowLink(false);
      qc.invalidateQueries({ queryKey: ["family"] });
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Failed to link account");
    }
    setLinking(false);
  };

  const children = familyData?.children || [];

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Family Controls</h1>
            <p className="text-gray-400 text-sm mt-1">Manage linked child accounts</p>
          </div>
          <button onClick={() => setShowLink(true)}
            className="flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-100 transition-colors">
            <Plus size={16} /> Link Child
          </button>
        </div>

        {message && (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm rounded-xl px-4 py-3 mb-4">
            {message}
          </div>
        )}

        {children.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Shield size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-1">No linked children yet</p>
            <p className="text-sm">Link a child account to manage what they watch</p>
          </div>
        ) : (
          <div className="space-y-4">
            {children.map((child: any) => (
              <div key={child.child_id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl font-bold">
                      {child.nickname?.charAt(0) || "K"}
                    </div>
                    <div>
                      <p className="font-semibold">{child.nickname || "Child"}</p>
                      <p className="text-xs text-gray-400">Linked account</p>
                    </div>
                  </div>
                  <Link href={`/settings/family/${child.child_id}`}
                    className="text-sm text-blue-400 hover:text-blue-300">
                    Edit controls →
                  </Link>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { icon: Eye, label: "Today", value: "0 min" },
                    { icon: Clock, label: "Limit", value: child.controls?.daily_limit_minutes ? `${child.controls.daily_limit_minutes} min` : "None" },
                    { icon: Lock, label: "Rating", value: child.controls?.max_content_rating || "G" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                      <Icon size={14} className="mx-auto mb-1 text-gray-400" />
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-semibold mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/settings/family/${child.child_id}/recommend`}
                    className="flex-1 text-center bg-white/10 hover:bg-white/20 py-2 rounded-xl text-sm transition-colors">
                    🎬 Recommend
                  </Link>
                  <Link href={`/settings/family/${child.child_id}/activity`}
                    className="flex-1 text-center bg-white/10 hover:bg-white/20 py-2 rounded-xl text-sm transition-colors">
                    📊 Activity
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link child modal */}
        {showLink && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold mb-2">Link Child Account</h2>
              <p className="text-gray-400 text-sm mb-4">
                Enter the child's username or phone number. They will receive a confirmation request.
              </p>
              <input value={childUsername} onChange={e => setChildUsername(e.target.value)}
                placeholder="@username or +256..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-white/30 placeholder-gray-600"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowLink(false)}
                  className="flex-1 bg-white/10 py-3 rounded-xl text-sm">Cancel</button>
                <button onClick={handleLinkChild} disabled={!childUsername || linking}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold transition-colors">
                  {linking ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
