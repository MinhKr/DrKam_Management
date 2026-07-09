/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Dev: dùng memory cache thay vì ghi cache ra .next/cache — tránh cảnh báo
  // "PackFileCacheStrategy ... invalid distance code" khi cache trên đĩa bị hỏng (hay gặp trên Windows).
  webpack: (config, { dev }) => {
    if (dev) config.cache = { type: 'memory' };
    return config;
  },
};

export default nextConfig;
