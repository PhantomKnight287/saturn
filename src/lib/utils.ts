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

export function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
