"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { formatUGX, timeAgo } from "@/lib/utils";
import { useState } from "react";
import { ArrowDownToLine, Clock, CheckCircle, XCircle } from "lucide-react";

const EARNING_TYPES: Record<string, { label: string; color: string }> = {
  ad_revenue:      { label: "Ad Revenue",          color: "text-blue-400" },
  membership:      { label: "Membership",           color: "text-purple-400" },
  tip:             { label: "Tip",                  color: "text-pink-400" },
  ppv:             { label: "Pay-Per-View",          color: "text-yellow-400" },
  movie_license:   { label: "Movie License",        color: "text-orange-400" },
  clip_referral:   { label: "Clip Referral",        color: "text-green-400" },
  sports_referral: { label: "Sports Referral",      color: "text-red-400" },
};

export default function EarningsPage() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState("mtn");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState("");

  const { data: wallet, refetch } = useQuery({
    queryKey: ["creator-wallet"],
    queryFn: async () => {
      const res = await api.get("/channels/me/earnings");
      return res.data.data;
    },
  });

  const { data: earningsData } = useQuery({
    queryKey: ["earnings-list"],
    queryFn: async () => {
      const res = await api.get("/creator/earnings?limit=30");
      return res.data.data;
    },
  });

  const handleWithdraw = async () => {
    setWithdrawing(true);
    setMessage("");
    try {
      await api.post("/creator/payouts", {
        amount_ugx: parseInt(withdrawAmount),
        method: withdrawMethod,
        phone_number: withdrawPhone,
      });
      setMessage("Withdrawal initiated! Funds will arrive shortly.");
      setShowWithdraw(false);
      refetch();
    } catch (err: any) {
      setMessage(err.response?.data?.detail || "Withdrawal failed");
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Earnings</h1>

        {message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3 mb-4">
            {message}
          </div>
        )}

        {/* Wallet cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-500/20 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Available</p>
            <p className="text-2xl font-bold text-green-400">{formatUGX(wallet?.available_ugx || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-900/20 border border-yellow-500/20 rounded-xl p-5">
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
              <Clock size={10} /> 7-day hold
            </div>
            <p className="text-2xl font-bold text-yellow-400">{formatUGX(wallet?.pending_ugx || 0)}</p>
          </div>
        </div>

        <button onClick={() => setShowWithdraw(true)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-3 rounded-xl text-sm font-semibold transition-colors mb-8">
          <ArrowDownToLine size={16} />
          Withdraw to Mobile Money
        </button>

        {/* How you earn table */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">How You Earn</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs uppercase">
                  <th className="text-left pb-3">Type</th>
                  <th className="text-right pb-3">Your Cut</th>
                  <th className="text-right pb-3">Platform</th>
                  <th className="text-right pb-3">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { type: "Ad Revenue", yours: "55%", platform: "45%", when: "Monthly" },
                  { type: "Memberships", yours: "75%", platform: "25%", when: "Monthly" },
                  { type: "Tips", yours: "90%", platform: "10%", when: "7-day hold" },
                  { type: "Pay-Per-View", yours: "70%", platform: "30%", when: "7-day hold" },
                  { type: "Movie Referral", yours: "10% of sale", platform: "—", when: "7-day hold" },
                  { type: "Sports Referral", yours: "8% of PPV", platform: "—", when: "7-day hold" },
                ].map(row => (
                  <tr key={row.type}>
                    <td className="py-2.5">{row.type}</td>
                    <td className="py-2.5 text-right text-green-400 font-medium">{row.yours}</td>
                    <td className="py-2.5 text-right text-gray-400">{row.platform}</td>
                    <td className="py-2.5 text-right text-gray-400 text-xs">{row.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Earning events */}
        <div>
          <h2 className="font-semibold mb-4">Recent Earnings</h2>
          <div className="space-y-2">
            {earningsData?.earnings?.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No earnings yet. Start creating!</p>
            )}
            {earningsData?.earnings?.map((e: any) => {
              const typeInfo = EARNING_TYPES[e.earning_type] || { label: e.earning_type, color: "text-white" };
              return (
                <div key={e.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${e.status === "available" ? "bg-green-400" : "bg-yellow-400"}`} />
                    <div>
                      <p className={`text-sm font-medium ${typeInfo.color}`}>{typeInfo.label}</p>
                      <p className="text-xs text-gray-500">{e.description || timeAgo(e.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-400">+{formatUGX(e.amount_ugx)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Withdraw modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Withdraw Earnings</h2>

              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-400">Available to withdraw</p>
                <p className="text-xl font-bold text-green-400">{formatUGX(wallet?.available_ugx || 0)}</p>
              </div>

              {/* Method */}
              <div className="flex gap-2 mb-4">
                {["mtn", "airtel"].map(m => (
                  <button key={m} onClick={() => setWithdrawMethod(m)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium uppercase transition-colors ${
                      withdrawMethod === m ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                    }`}>
                    {m === "mtn" ? "MTN MoMo" : "Airtel Money"}
                  </button>
                ))}
              </div>

              <input value={withdrawPhone} onChange={e => setWithdrawPhone(e.target.value)}
                placeholder="+256 7XX XXX XXX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-white/30 placeholder-gray-600"
              />
              <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                placeholder="Amount (min UGX 50,000)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4 focus:outline-none focus:border-white/30 placeholder-gray-600"
              />

              <div className="flex gap-3">
                <button onClick={() => setShowWithdraw(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={handleWithdraw} disabled={withdrawing || !withdrawAmount || !withdrawPhone}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold transition-colors">
                  {withdrawing ? "Processing..." : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
