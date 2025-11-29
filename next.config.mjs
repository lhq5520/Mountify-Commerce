// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    // other protocals
    // remotePatterns: [
    //   { protocol: "https", hostname: "images.unsplash.com" },
    //   { protocol: "https", hostname: "plus.unsplash.com" },
    // ],
  },
};

export default nextConfig;
