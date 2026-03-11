/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // 静态导出，适合部署到任何静态托管
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;