import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Set basePath to repo name when deploying to GitHub Pages subdirectory.
  // Remove or set to '' if deploying to a custom domain root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
}

export default nextConfig
