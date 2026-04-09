import { fileURLToPath } from 'node:url'
import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

async function createNextConfig(): Promise<NextConfig> {
  const { createJiti } = await import('jiti')
  const jiti = createJiti(fileURLToPath(import.meta.url))
  if (process.env.GITHUB_ACTIONS !== 'true') {
    await jiti.import('./src/env')
  }

  const nextConfig: NextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    productionBrowserSourceMaps: process.env.SOURCE_MAPS === 'true',
    logging: {
      fetches: {
        fullUrl: true,
      },
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    typedRoutes: true,
    images: {
      remotePatterns: [
        new URL('https://github.com/**'),
        new URL('https://avatars.githubusercontent.com/**'),
      ],
    },
    headers: async () => [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self';",
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
        ],
      },
    ],
  }

  return nextConfig
}

const bundleAnalyzerPlugin = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const NextApp = async () => {
  const nextConfig = await createNextConfig()
  const plugins = [bundleAnalyzerPlugin]
  return plugins.reduce((config, plugin) => plugin(config), nextConfig)
}

export default NextApp
