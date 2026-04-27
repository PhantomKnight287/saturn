import type { app } from '../app'
import { registerProjectRoutes } from './organization/projects/register'
import { registerOrganizationRoutes } from './organization/register'

export function registerRoutes(hono: typeof app) {
  registerOrganizationRoutes(hono)
  registerProjectRoutes(hono)
}
