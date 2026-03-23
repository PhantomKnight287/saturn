import type Link from 'next/link'
import type { roles } from './server/auth/permissions'
import type { statusEnum } from './server/db/schema'

export type Status = (typeof statusEnum.enumValues)[number]
export type Role = keyof typeof roles

export type RouteImpl = Parameters<typeof Link>[0]['href']
