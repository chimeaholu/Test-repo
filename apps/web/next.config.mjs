const nextConfig = {
  transpilePackages: ["@agrodomain/contracts", "@agrodomain/config"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.agrodomain.com",
        pathname: "/images/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/agrodomain-*/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/agrodomain/**",
      },
    ],
  },
};

export default nextConfig;
