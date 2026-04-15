import type { app } from '../app'
import { registerOrganizationRoutes } from './organization/register'

export function registerRoutes(hono: typeof app) {
  registerOrganizationRoutes(hono)
}
