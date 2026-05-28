/** biome-ignore-all lint/suspicious/noBitwiseOperators: Need it for color magic */
import { type ClassValue, clsx } from 'clsx'
import slugify from 'slugify'
import { twMerge } from 'tailwind-merge'
import { slugAlphabet } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function titleToSlug(title: string) {
  const slugified = slugify(title, { lower: true })
  const slugifiedWithSuffix = `${slugified}-${slugAlphabet()}`
  return {
    slugified,
    slugifiedWithSuffix,
  }
}

export function seedToColor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }

  const h = Math.abs(hash) % 360
  const s = 55 + (Math.abs(hash >> 8) % 20)
  const l = 45 + (Math.abs(hash >> 16) % 15)

  // HSL to hex
  const lNorm = l / 100
  const sNorm = s / 100
  const a = sNorm * Math.min(lNorm, 1 - lNorm)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }

  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Format a genuine moment (a UTC instant) as a date in the viewer's timezone.
 * Pass the viewer's IANA zone; falls back to the runtime zone when omitted.
 */
export function formatDate(date: Date, timeZone?: string) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  })
}

/** Today as a `'YYYY-MM-DD'` calendar-date string in the given IANA zone (UTC by default). */
export function todayDateOnly(timeZone = 'UTC') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Format a calendar date stored as a zoneless `'YYYY-MM-DD'` string. The same
 * literal day for every viewer — never shifted by a timezone.
 */
export function formatDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return value
  }
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const date = new Date(y, m - 1, d)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return value
  }
  return formatDate(date)
}

/** Native `<input type="date">` only accepts a `yyyy-MM-dd` value. */
export function toDateInputValue(value: string): string {
  // Already a date-only string: return as-is so UTC parsing doesn't shift it.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
