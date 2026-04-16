import { vercel } from '@t3-oss/env-core/presets-zod'
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  extends: [vercel()],
  createFinalSchema: (shape) =>
    z.object(shape).refine(
      (env) => {
        const hasProxy = !!env.EMAIL_PROXY
        const hasSmtp =
          !!env.MAIL_HOST &&
          !!env.MAIL_PORT &&
          !!env.MAIL_USER &&
          !!env.MAIL_PASSWORD
        return hasProxy || hasSmtp
      },
      {
        message:
          'Either EMAIL_PROXY or SMTP credentials (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASSWORD) must be provided',
      }
    ),
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    // Database
    DATABASE_URL: z.url(),
    // Auth
    BETTER_AUTH_SECRET: z.string().min(1),
    CORS_ORIGIN: z.preprocess((val) => {
      if (typeof val === 'string') {
        const s = val.trim()
        if (s === '') {
          return undefined
        }
        try {
          const parsed = JSON.parse(s)
          if (Array.isArray(parsed)) {
            return parsed
          }
        } catch {
          // ignore JSON parse errors
        }
        return s
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
      }
      return val
    }, z.array(z.url()).optional()),
    // BETTER_AUTH_URL: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    // Emails
    MAIL_HOST: z.string().min(1).optional(),
    MAIL_PORT: z.coerce.number().min(1).optional(),
    MAIL_USER: z.string().min(1).optional(),
    MAIL_PASSWORD: z.string().min(1).optional(),
    MAIL_SECURE: z.coerce.boolean().optional(),
    EMAIL_SENDER: z.string().optional().nullable(),
    EMAIL_PROXY: z.string().optional().nullable(),
    EMAIL_PROXY_SECRET: z.string().optional().nullable(),
    // Polar
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_WEBHOOK_SECRET: z.string().min(1),
    POLAR_PRODUCT_ID: z.string(),
    POLAR_PRODUCT_SLUG: z.string(),
    // S3
    S3_ENDPOINT: z.string().min(1),
    S3_REGION: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_BASE_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BASE_URL:
      process.env.NEXT_PUBLIC_BASE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined),
  },
})
