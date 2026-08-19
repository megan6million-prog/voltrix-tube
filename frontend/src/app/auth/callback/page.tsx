"use client";
import { useEffect } from "react";
import { useAppStore } from "@/store/app.store";

export default function AuthCallbackPage() {
  const { setUser } = useAppStore();

  useEffect(() => {
    // Parse tokens from URL fragment
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token) {
      localStorage.setItem("voltrix_access_token", access_token);
      localStorage.setItem("voltrix_refresh_token", refresh_token || "");

      // Fetch user profile
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${access_token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data?.data) {
            localStorage.setItem("voltrix_user", JSON.stringify(data.data));
            setUser(data.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          window.location.href = "/";
        });
    } else {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}
