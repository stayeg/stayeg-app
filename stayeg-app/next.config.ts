import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "preview-chat-b1f7b228-d558-43b2-a40e-9099a3e86d3d.space.z.ai",
    "*.space.z.ai",
  ],
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken', 'razorpay', 'resend'],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
};
export default nextConfig;
