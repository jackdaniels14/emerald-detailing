/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/emerald-detailing',
  assetPrefix: '/emerald-detailing/',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
