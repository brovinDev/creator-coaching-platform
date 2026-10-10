import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Keep old /student links (emails, bookmarks) working after the move to root-level member pages
    return [
      { source: "/student", destination: "/courses", permanent: true },
      { source: "/student/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
