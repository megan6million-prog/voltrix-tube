import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Voltrix — Uganda's Video Platform",
  description: "Watch movies, sports, gaming and more. Support Ugandan creators.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f0f0f] text-white min-h-screen" style={{fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"}}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
