/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bullmq", "ioredis", "@modelcontextprotocol/sdk"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb"
    }
  }
};

export default nextConfig;
