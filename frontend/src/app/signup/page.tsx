"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useAppStore } from "@/store/app.store";
import { Eye, EyeOff, Tv } from "lucide-react";

const schema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, underscore only"),
  phone_primary: z.string().regex(/^\+256\d{9}$/, "Format: +256XXXXXXXXX"),
  password: z.string().min(8, "Minimum 8 characters"),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/signup", data);
      const result = res.data.data;

      // Dev mode — no OTP needed, go straight to login
      if (result.dev_mode) {
        const loginRes = await api.post("/auth/login", {
          phone: data.phone_primary,
          password: data.password,
        });
        const { access_token, refresh_token, user } = loginRes.data.data;
        localStorage.setItem("voltrix_access_token", access_token);
        localStorage.setItem("voltrix_refresh_token", refresh_token);
        setUser(user);
        router.push("/");
        return;
      }

      // Production — OTP verification
      localStorage.setItem("voltrix_pending_phone", data.phone_primary);
      router.push("/verify-otp");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Signup failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
            <Tv size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold">Voltrix</span>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-gray-400 text-sm mb-6">Join Uganda's video platform</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                <input {...register("username")}
                  placeholder="yourname"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
                />
              </div>
              {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Phone Number</label>
              <input {...register("phone_primary")}
                placeholder="+256 7XX XXX XXX"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
              />
              {errors.phone_primary && <p className="text-red-400 text-xs mt-1">{errors.phone_primary.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Password</label>
              <div className="relative">
                <input {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-white/30 placeholder-gray-600"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Social login placeholders */}
          <div className="space-y-3">
            <button className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">Log in</Link>
          </p>

          <p className="text-center text-xs text-gray-600 mt-4">
            By signing up you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
