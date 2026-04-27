import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { logger } from 'hono/logger'
import { env } from '@/env'
import { registerRoutes } from './routes'

export const app = new OpenAPIHono({}).basePath('/api/v1')
app.use(
  '*',
  logger((str) => {
    const timestamp = new Date().toISOString()
    const match = str.match(/(\w+)\s+(\S+)\s+(\d+)\s+(\d+)ms/)
    if (match) {
      const [, method, path, status, time] = match
      console.log(`${method} [${timestamp}] ${path} ${status} ${time}ms`)
    } else {
      console.log(str)
    }
  })
)

app.doc('/docs', {
  openapi: '3.0.0',
  info: {
    title: 'Saturn API',
    version: '1.0.0',
    description: 'PRO Plan rest api for Saturn',
  },
  servers: [
    {
      url: env.NEXT_PUBLIC_BASE_URL,
    },
  ],
})

app.get(
  '/reference',
  Scalar({
    url: `${env.NEXT_PUBLIC_BASE_URL}/api/v1/docs`,
    theme: 'deepSpace',
  })
)
registerRoutes(app)
