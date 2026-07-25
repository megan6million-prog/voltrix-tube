import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-[#0f0f0f] text-white min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
