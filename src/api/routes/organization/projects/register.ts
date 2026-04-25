import type { app } from '@/api/app'
import { handler as getHandler } from './get'
import { handler as postHandler } from './post'

export function registerProjectRoutes(hono: typeof app) {
  getHandler(hono)
  postHandler(hono)
}
