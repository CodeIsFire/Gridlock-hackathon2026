/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_MAPMYINDIA_KEY: process.env.NEXT_PUBLIC_MAPMYINDIA_KEY || '',
  },
  output: 'standalone',
}

module.exports = nextConfig
