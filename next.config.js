/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Enable browser sourcemaps in production so we can debug runtime errors on dev/stage easily.
  // Consider disabling for prod later if you don't want sourcemaps publicly accessible.
  productionBrowserSourceMaps: true,
}

module.exports = nextConfig