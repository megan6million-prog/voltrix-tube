"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useState } from "react";
import {
  Save, Eye, EyeOff, TestTube2, CheckCircle,
  XCircle, AlertCircle, Settings, CreditCard,
  Percent, Shield, Sliders
} from "lucide-react";
import Link from "next/link";

// Category definitions with all settings grouped
const SETTING_CATEGORIES = [
  {
    id: "payment_gateways",
    label: "Payment Gateways",
    icon: CreditCard,
    color: "text-yellow-400",
    description: "Configure MTN, Airtel, Flutterwave and Crypto API keys",
    settings: [
      // MTN MoMo
      { key: "mtn_momo_enabled",              type: "boolean", label: "MTN MoMo Enabled",             category: "payment" },
      { key: "mtn_momo_environment",          type: "select",  label: "MTN Environment",              category: "payment", options: ["sandbox", "production"] },
      { key: "mtn_momo_base_url",             type: "string",  label: "MTN Base URL",                 category: "payment" },
      { key: "mtn_momo_collection_primary_key", type: "string", label: "MTN Collection Primary Key",  category: "payment", sensitive: true },
      { key: "mtn_momo_collection_secret",    type: "string",  label: "MTN Collection Secret",        category: "payment", sensitive: true },
      { key: "mtn_momo_disbursement_primary_key", type: "string", label: "MTN Disbursement Primary Key", category: "payment", sensitive: true },
      { key: "mtn_momo_disbursement_secret",  type: "string",  label: "MTN Disbursement Secret",      category: "payment", sensitive: true },
      // Airtel Money
      { key: "airtel_money_enabled",          type: "boolean", label: "Airtel Money Enabled",         category: "payment" },
      { key: "airtel_environment",            type: "select",  label: "Airtel Environment",           category: "payment", options: ["sandbox", "production"] },
      { key: "airtel_base_url",               type: "string",  label: "Airtel Base URL",              category: "payment" },
      { key: "airtel_client_id",              type: "string",  label: "Airtel Client ID",             category: "payment", sensitive: true },
      { key: "airtel_client_secret",          type: "string",  label: "Airtel Client Secret",         category: "payment", sensitive: true },
      // Flutterwave
      { key: "flutterwave_enabled",           type: "boolean", label: "Flutterwave Enabled",          category: "payment" },
      { key: "flutterwave_secret_key",        type: "string",  label: "Flutterwave Secret Key",       category: "payment", sensitive: true },
      { key: "flutterwave_public_key",        type: "string",  label: "Flutterwave Public Key",       category: "payment", sensitive: true },
      // Coinbase
      { key: "coinbase_enabled",              type: "boolean", label: "Crypto Payments Enabled",      category: "payment" },
      { key: "coinbase_api_key",              type: "string",  label: "Coinbase API Key",             category: "payment", sensitive: true },
      { key: "coinbase_webhook_secret",       type: "string",  label: "Coinbase Webhook Secret",      category: "payment", sensitive: true },
    ],
  },
  {
    id: "platform_fees",
    label: "Platform Fees",
    icon: Percent,
    color: "text-green-400",
    description: "Set platform cut percentages for each revenue type",
    settings: [
      { key: "ad_revenue_creator_pct",        type: "number",  label: "Ad Revenue — Creator %",       category: "fees" },
      { key: "tip_platform_cut_pct",          type: "number",  label: "Tips — Platform Cut %",        category: "fees" },
      { key: "membership_platform_cut",       type: "number",  label: "Memberships — Platform Cut %", category: "fees" },
      { key: "ppv_platform_cut_pct",          type: "number",  label: "PPV — Platform Cut %",         category: "fees" },
      { key: "movie_referral_pct",            type: "number",  label: "Movie Referral %",             category: "fees" },
      { key: "sports_referral_pct",           type: "number",  label: "Sports Referral %",            category: "fees" },
    ],
  },
  {
    id: "wallet_limits",
    label: "Wallet & Payouts",
    icon: Sliders,
    color: "text-blue-400",
    description: "Minimum top-up, maximum balance, payout thresholds",
    settings: [
      { key: "min_wallet_topup_ugx",          type: "number",  label: "Min Top-Up (UGX)",             category: "payment" },
      { key: "max_wallet_balance_ugx",        type: "number",  label: "Max Wallet Balance (UGX)",     category: "payment" },
      { key: "min_creator_payout_ugx",        type: "number",  label: "Min Creator Payout (UGX)",     category: "payment" },
      { key: "earnings_hold_days",            type: "number",  label: "Earnings Hold Days",           category: "payment" },
      { key: "creator_payout_schedule",       type: "select",  label: "Payout Schedule",              category: "payment", options: ["weekly", "monthly"] },
    ],
  },
  {
    id: "content",
    label: "Content & AI",
    icon: Shield,
    color: "text-purple-400",
    description: "Rekognition moderation, AI assistant, missing content alerts",
    settings: [
      { key: "rekognition_enabled",           type: "boolean", label: "Content Moderation (Rekognition)", category: "content" },
      { key: "rekognition_min_confidence",    type: "number",  label: "Moderation Confidence Threshold %", category: "content" },
      { key: "ai_endpoint_enabled",           type: "boolean", label: "AI Assistant Enabled",         category: "content" },
      { key: "missing_content_notify",        type: "boolean", label: "Admin Alert on Missing Content", category: "content" },
    ],
  },
];

const GATEWAYS_TO_TEST = ["mtn", "airtel", "flutterwave", "coinbase"];

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState("payment_gateways");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, "ok" | "fail" | "testing">>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, "saved" | "saving" | null>>({});

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await api.get("/admin/settings");
      return res.data.data as { key: string; value: string; type: string; is_sensitive: boolean }[];
    },
  });

  const getSettingValue = (key: string) => {
    if (editValues[key] !== undefined) return editValues[key];
    const s = settingsData?.find(s => s.key === key);
    return s?.value || "";
  };

  const saveSetting = async (key: string, value: string) => {
    setSaveStatus(p => ({ ...p, [key]: "saving" }));
    try {
      await api.patch("/admin/settings", { setting_key: key, setting_value: value });
      setSaveStatus(p => ({ ...p, [key]: "saved" }));
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setTimeout(() => setSaveStatus(p => ({ ...p, [key]: null })), 2000);
    } catch {
      setSaveStatus(p => ({ ...p, [key]: null }));
    }
  };

  const testGateway = async (gateway: string) => {
    setTestResults(p => ({ ...p, [gateway]: "testing" }));
    try {
      await api.post("/admin/settings/gateway/test", { gateway });
      setTestResults(p => ({ ...p, [gateway]: "ok" }));
    } catch {
      setTestResults(p => ({ ...p, [gateway]: "fail" }));
    }
  };

  const activeSection = SETTING_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Admin header */}
      <header className="h-14 bg-[#0f0f0f] border-b border-white/10 flex items-center px-6 gap-4">
        <Link href="/admin" className="text-gray-400 hover:text-white text-sm">← Dashboard</Link>
        <span className="text-gray-600">/</span>
        <span className="font-semibold">Platform Settings</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <Shield size={12} />
          Sensitive values stored in AWS Secrets Manager
        </div>
      </header>

      <div className="flex">
        {/* Settings sidebar */}
        <aside className="w-64 min-h-[calc(100vh-56px)] border-r border-white/10 py-4 px-3">
          {SETTING_CATEGORIES.map(({ id, label, icon: Icon, color, description }) => (
            <button key={id} onClick={() => setActiveCategory(id)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl mb-1 text-left transition-colors ${
                activeCategory === id ? "bg-white/10" : "hover:bg-white/5"
              }`}>
              <Icon size={18} className={`${color} mt-0.5 flex-shrink-0`} />
              <div>
                <p className={`text-sm font-medium ${activeCategory === id ? "text-white" : "text-gray-300"}`}>
                  {label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{description}</p>
              </div>
            </button>
          ))}
        </aside>

        {/* Settings content */}
        <main className="flex-1 p-6 max-w-3xl">
          {activeSection && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <activeSection.icon size={24} className={activeSection.color} />
                <div>
                  <h1 className="text-xl font-bold">{activeSection.label}</h1>
                  <p className="text-gray-400 text-sm mt-0.5">{activeSection.description}</p>
                </div>
              </div>

              {/* Gateway test buttons (only for payment gateways section) */}
              {activeCategory === "payment_gateways" && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                  <p className="text-sm font-medium mb-3">Test Connections</p>
                  <div className="flex flex-wrap gap-2">
                    {GATEWAYS_TO_TEST.map(gw => (
                      <button key={gw} onClick={() => testGateway(gw)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
                          testResults[gw] === "ok" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                          testResults[gw] === "fail" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          testResults[gw] === "testing" ? "bg-white/10 text-gray-400" :
                          "bg-white/10 hover:bg-white/20"
                        }`}>
                        {testResults[gw] === "ok" && <CheckCircle size={14} />}
                        {testResults[gw] === "fail" && <XCircle size={14} />}
                        {testResults[gw] === "testing" && <TestTube2 size={14} className="animate-pulse" />}
                        {!testResults[gw] && <TestTube2 size={14} />}
                        <span className="capitalize">{gw}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings form */}
              <div className="space-y-4">
                {activeSection.settings.map(({ key, type, label, sensitive, options }) => {
                  const currentValue = getSettingValue(key);
                  const isShowing = showSensitive[key];
                  const status = saveStatus[key];

                  return (
                    <div key={key}
                      className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <label className="text-sm font-medium">{label}</label>
                            {sensitive && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                <Shield size={8} /> Encrypted
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-mono">{key}</p>
                        </div>

                        {/* Save status */}
                        {status && (
                          <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${
                            status === "saved" ? "text-green-400" : "text-gray-400"
                          }`}>
                            {status === "saved" ? <CheckCircle size={12} /> : null}
                            {status === "saved" ? "Saved" : "Saving..."}
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        {type === "boolean" ? (
                          <label className="flex items-center gap-3 cursor-pointer w-fit">
                            <div className="relative">
                              <input type="checkbox"
                                checked={currentValue === "true" || currentValue === "1"}
                                onChange={e => {
                                  const val = e.target.checked ? "true" : "false";
                                  setEditValues(p => ({ ...p, [key]: val }));
                                  saveSetting(key, val);
                                }}
                                className="sr-only"
                              />
                              <div className={`w-11 h-6 rounded-full transition-colors ${
                                (currentValue === "true" || currentValue === "1") ? "bg-green-500" : "bg-white/20"
                              }`}>
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  (currentValue === "true" || currentValue === "1") ? "translate-x-5.5" : "translate-x-0.5"
                                }`} />
                              </div>
                            </div>
                            <span className="text-sm text-gray-300">
                              {(currentValue === "true" || currentValue === "1") ? "Enabled" : "Disabled"}
                            </span>
                          </label>
                        ) : type === "select" && options ? (
                          <select
                            value={currentValue}
                            onChange={e => {
                              setEditValues(p => ({ ...p, [key]: e.target.value }));
                              saveSetting(key, e.target.value);
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30 w-full max-w-xs"
                          >
                            <option value="">Select...</option>
                            {options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <div className="relative flex-1 max-w-lg">
                              <input
                                type={sensitive && !isShowing ? "password" : "text"}
                                value={sensitive && !isShowing && currentValue && currentValue !== "***stored-in-secrets-manager***"
                                  ? currentValue : currentValue === "***stored-in-secrets-manager***" ? "" : currentValue}
                                onChange={e => setEditValues(p => ({ ...p, [key]: e.target.value }))}
                                placeholder={
                                  currentValue === "***stored-in-secrets-manager***"
                                    ? "••• stored securely — enter new value to update •••"
                                    : `Enter ${label.toLowerCase()}`
                                }
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600 pr-10"
                              />
                              {sensitive && (
                                <button
                                  type="button"
                                  onClick={() => setShowSensitive(p => ({ ...p, [key]: !p[key] }))}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                >
                                  {isShowing ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => saveSetting(key, editValues[key] ?? currentValue)}
                              disabled={editValues[key] === undefined || editValues[key] === currentValue}
                              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 px-4 py-2.5 rounded-lg text-sm transition-colors flex-shrink-0"
                            >
                              <Save size={14} />
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instructions for payment gateways */}
              {activeCategory === "payment_gateways" && (
                <div className="mt-6 space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-blue-300 mb-2">📱 MTN MoMo Setup</p>
                    <ol className="list-decimal list-inside text-gray-300 space-y-1 text-xs">
                      <li>Sign up at <span className="text-blue-400">momodeveloper.mtn.com</span></li>
                      <li>Create a Collection and Disbursement product subscription</li>
                      <li>Copy Primary Key and generate API Secret (Base64 encoded user:password)</li>
                      <li>Set Environment to "sandbox" for testing, "production" when live</li>
                      <li>Click "Test MTN" above to verify connection</li>
                    </ol>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-red-300 mb-2">📱 Airtel Money Setup</p>
                    <ol className="list-decimal list-inside text-gray-300 space-y-1 text-xs">
                      <li>Sign up at <span className="text-red-400">developer.airtel.africa</span></li>
                      <li>Create an application and get Client ID + Client Secret</li>
                      <li>Set Base URL to sandbox or production endpoint</li>
                      <li>Click "Test Airtel" above to verify connection</li>
                    </ol>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-sm">
                    <p className="font-semibold text-green-300 mb-2">🌊 Flutterwave Setup</p>
                    <ol className="list-decimal list-inside text-gray-300 space-y-1 text-xs">
                      <li>Sign up at <span className="text-green-400">flutterwave.com</span></li>
                      <li>Go to Settings → API Keys</li>
                      <li>Copy Secret Key and Public Key</li>
                      <li>Enable when your organization is approved</li>
                    </ol>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
