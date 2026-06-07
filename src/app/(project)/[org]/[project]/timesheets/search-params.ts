import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'
import { statusEnum } from '@/server/db/schema'

const statusFilterValues = ['all', ...statusEnum.enumValues] as const

export const teamEntriesSearchParams = {
  page: parseAsInteger.withDefault(1),
  member: parseAsString.withDefault('all'),
  status: parseAsStringLiteral(statusFilterValues).withDefault('all'),
  requirement: parseAsString.withDefault('all'),
}
