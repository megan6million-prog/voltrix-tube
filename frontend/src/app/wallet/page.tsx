"use client";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import api from "@/lib/api";
import { useAppStore } from "@/store/app.store";
import { formatUGX, timeAgo } from "@/lib/utils";
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Gift, Coins } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const QUICK_AMOUNTS = [5000, 10000, 20000, 50000, 100000];
const GATEWAYS = [
  { id: "mtn", label: "MTN Mobile Money", color: "bg-yellow-500" },
  { id: "airtel", label: "Airtel Money", color: "bg-red-500" },
  { id: "card", label: "Visa / Mastercard", color: "bg-blue-500" },
  { id: "crypto", label: "Crypto (USDT/BTC)", color: "bg-orange-500" },
];

export default function WalletPage() {
  const { walletBalance, bonusBalance, setWalletBalance } = useAppStore();
  const [showTopup, setShowTopup] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(20000);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMessage, setTopupMessage] = useState("");

  const { data: walletData, refetch } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await api.get("/wallet");
      setWalletBalance(res.data.data.balance_ugx, res.data.data.bonus_balance_ugx);
      return res.data.data;
    },
  });

  const { data: txData } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await api.get("/wallet/transactions?limit=20");
      return res.data.data;
    },
  });

  const handleTopup = async () => {
    const amount = customAmount ? parseInt(customAmount) : selectedAmount;
    if (amount < 1000) return;
    setTopupLoading(true);
    setTopupMessage("");
    try {
      const res = await api.post("/wallet/topup", {
        amount_ugx: amount,
        gateway: selectedGateway,
        phone_number: phone || undefined,
      });
      setTopupMessage(res.data.data.message || "Payment initiated. Confirm on your phone.");
      // Poll for completion
      const topupId = res.data.data.topup_id;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 20) { clearInterval(poll); return; }
        const statusRes = await api.get(`/wallet/topup/${topupId}`);
        if (statusRes.data.data.status === "completed") {
          clearInterval(poll);
          setShowTopup(false);
          setTopupMessage("");
          refetch();
        }
      }, 3000);
    } catch (err: any) {
      setTopupMessage(err.response?.data?.detail || "Payment failed. Try again.");
    } finally {
      setTopupLoading(false);
    }
  };

  const txTypeIcon = (type: string) => {
    if (type === "topup" || type === "bonus" || type === "transfer_received") return <ArrowDownLeft size={14} className="text-green-400" />;
    return <ArrowUpRight size={14} className="text-red-400" />;
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Wallet</h1>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-red-600/20 to-purple-600/20 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Wallet size={16} />
            <span>Available Balance</span>
          </div>
          <p className="text-4xl font-bold mb-1">{formatUGX(walletBalance)}</p>
          {bonusBalance > 0 && (
            <p className="text-sm text-green-400 flex items-center gap-1">
              <Gift size={12} />
              +{formatUGX(bonusBalance)} bonus credits
            </p>
          )}
          <div className="flex gap-3 mt-5">
            <button onClick={() => setShowTopup(true)}
              className="flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition-colors">
              <Plus size={16} />
              Add Money
            </button>
            <Link href="/wallet/send"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
              Send
            </Link>
          </div>
        </div>

        {/* Coins */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Coins size={18} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Voltrix Coins</p>
              <p className="text-xs text-gray-400">Use for tips and gifts</p>
            </div>
          </div>
          <Link href="/wallet/coins"
            className="text-sm text-blue-400 hover:text-blue-300">
            Buy Coins →
          </Link>
        </div>

        {/* Top-up modal */}
        {showTopup && (
          <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Add Money</h2>

              {/* Quick amounts */}
              <p className="text-sm text-gray-400 mb-2">Select amount</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {QUICK_AMOUNTS.map((amt) => (
                  <button key={amt}
                    onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                    className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                      selectedAmount === amt && !customAmount
                        ? "bg-white text-black"
                        : "bg-white/10 hover:bg-white/20"
                    }`}>
                    {formatUGX(amt)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(0); }}
                placeholder="Custom amount (min UGX 1,000)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-white/30 placeholder-gray-600"
              />

              {/* Gateway */}
              <p className="text-sm text-gray-400 mb-2">Pay with</p>
              <div className="space-y-2 mb-4">
                {GATEWAYS.map((gw) => (
                  <button key={gw.id}
                    onClick={() => setSelectedGateway(gw.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-colors ${
                      selectedGateway === gw.id ? "bg-white/15 border border-white/20" : "bg-white/5 hover:bg-white/10"
                    }`}>
                    <div className={`w-3 h-3 rounded-full ${gw.color}`} />
                    {gw.label}
                    {selectedGateway === gw.id && (
                      <span className="ml-auto text-green-400">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Phone input for mobile money */}
              {(selectedGateway === "mtn" || selectedGateway === "airtel") && (
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+256 7XX XXX XXX"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none focus:border-white/30 placeholder-gray-600"
                />
              )}

              {topupMessage && (
                <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm rounded-xl p-3 mb-4">
                  {topupMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setShowTopup(false); setTopupMessage(""); }}
                  className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={handleTopup} disabled={topupLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl text-sm font-semibold transition-colors">
                  {topupLoading ? "Processing..." : `Add ${formatUGX(customAmount ? parseInt(customAmount) : selectedAmount)}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Transaction History</h2>
          <div className="space-y-2">
            {txData?.transactions?.length === 0 && (
              <p className="text-center text-gray-500 py-8 text-sm">No transactions yet</p>
            )}
            {txData?.transactions?.map((tx: any) => (
              <div key={tx.id}
                className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    {txTypeIcon(tx.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-500">{timeAgo(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.amount_ugx > 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.amount_ugx > 0 ? "+" : ""}{formatUGX(Math.abs(tx.amount_ugx))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
