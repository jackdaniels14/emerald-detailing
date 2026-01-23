/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove 'export' to enable dynamic features (API routes, server-side rendering)
  // output: 'export',
  // basePath: '/emerald-detailing',
  // assetPrefix: '/emerald-detailing/',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
