/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["placeholder.cloudfront.net", "lh3.googleusercontent.com"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/v1"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
