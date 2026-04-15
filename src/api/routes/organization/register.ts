import type { app } from '@/api/app'
import { handler as getHandler } from './get'
import { handler as patchHandler } from './patch'

export function registerOrganizationRoutes(hono: typeof app) {
  getHandler(hono)
  patchHandler(hono)
}
