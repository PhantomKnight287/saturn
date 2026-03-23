import { customAlphabet } from 'nanoid'
import { SaturnLogoDark, SaturnLogoLight } from '@/components/icons/saturn-logo'

const APP_NAME = 'Saturn'
const APP_DEFAULT_TITLE = 'Saturn'
const APP_TITLE_TEMPLATE = '%s | Saturn'
const APP_DESCRIPTION =
  'A comprehensive platform to manage your freelance business'

const logo = (
  <>
    <SaturnLogoDark className='size-6 dark:hidden' />
    <SaturnLogoLight className='hidden size-6 dark:block' />
  </>
)

const slugAlphabet = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6)

const EXPENSE_CATEGORIES = {
  software: {
    label: 'Software / Web Development',
    categories: [
      'Cloud hosting',
      'Database',
      'Object storage',
      'CDN',
      'Domain / DNS',
      'CI/CD',
      'Error tracking',
      'Email service',
      'SMS / OTP',
      'Auth provider',
      'AI/LLM API',
    ],
  },
  mobile: {
    label: 'Mobile App Development',
    categories: [
      'Apple Developer Programme',
      'Google Play Console',
      'Push notifications',
      'Analytics',
      'Crash reporting',
      'Backend API hosting',
      'Device testing',
    ],
  },
  design: {
    label: 'Design (UI/UX, Brand, Graphic)',
    categories: [
      'Design tools (Figma, Adobe CC)',
      'Stock assets',
      'Font licences',
      'Icon packs',
      'Print / production',
    ],
  },
  video: {
    label: 'Video Production / Editing',
    categories: [
      'Video editing software',
      'Stock footage',
      'Music licences',
      'Storage',
      'Transcription / subtitles',
      'Video hosting',
      'Equipment rental',
    ],
  },
  writing: {
    label: 'Content Writing / Copywriting',
    categories: [
      'SEO tools',
      'AI writing assist',
      'Plagiarism checker',
      'Stock images',
    ],
  },
  data: {
    label: 'Data / Analytics / ML',
    categories: [
      'Cloud compute',
      'Data warehouse',
      'BI / dashboarding',
      'API calls (LLM / embedding)',
    ],
  },
  marketing: {
    label: 'Marketing / Social Media',
    categories: [
      'Scheduling tools',
      'Paid ad spend',
      'Email platform',
      'Analytics',
      'CRM',
    ],
  },
  consulting: {
    label: 'Consulting / Strategy',
    categories: [
      'Research databases / reports',
      'Presentation tools',
      'Document signing',
      'Travel & accommodation',
      'Video calls',
    ],
  },
} as const

export {
  APP_NAME,
  APP_DEFAULT_TITLE,
  APP_TITLE_TEMPLATE,
  APP_DESCRIPTION,
  logo,
  slugAlphabet,
  EXPENSE_CATEGORIES,
}
