import type { IConfig } from 'next-sitemap'

const siteUrl =
  process.env.NEXT_PUBLIC_BASE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')

const config: IConfig = {
  siteUrl,
  generateRobotsTxt: true,
  exclude: [
    '/auth/*',
    '/account/*',
    '/*.webmanifest',
    '/*.png',
    '/*.jpg',
    '/*.jpeg',
    '/*.ico',
    '/*.svg',
  ],
}

export default config
