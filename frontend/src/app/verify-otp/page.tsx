"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAppStore } from "@/store/app.store";
import { Tv } from "lucide-react";

export default function VerifyOTPPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phone = typeof window !== "undefined"
    ? localStorage.getItem("voltrix_pending_phone") || ""
    : "";

  // Countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/verify-otp", { phone, otp: code });
      const { access_token, refresh_token, user } = res.data.data;
      localStorage.setItem("voltrix_access_token", access_token);
      localStorage.setItem("voltrix_refresh_token", refresh_token);
      localStorage.removeItem("voltrix_pending_phone");
      setUser(user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid or expired code");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    await api.post("/auth/login/otp", { phone });
    setResendTimer(60);
  };

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (otp.every((d) => d !== "")) handleVerify();
  }, [otp]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <Tv size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold">Voltrix</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-2">Verify your phone</h1>
          <p className="text-gray-400 text-sm mb-8">
            We sent a 6-digit code to<br />
            <span className="text-white font-medium">{phone}</span>
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex justify-center gap-3 mb-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-red-500 transition-colors"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || otp.some((d) => !d)}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mb-4"
          >
            {loading ? "Verifying..." : "Verify"}
          </button>

          <p className="text-sm text-gray-500">
            {resendTimer > 0 ? (
              <>Resend code in <span className="text-white">{resendTimer}s</span></>
            ) : (
              <button onClick={handleResend} className="text-white hover:underline">
                Resend code
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
