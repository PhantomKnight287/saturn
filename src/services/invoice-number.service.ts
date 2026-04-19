type ArgSpec =
  | { type: 'none' }
  | {
      type: 'number'
      default: number
      min: number
      max: number
    }
  | {
      type: 'enum'
      default: string
      options: { value: string; label: string; sample: string }[]
    }

export interface InvoiceTemplateVariable {
  arg: ArgSpec
  description: string
  id: string
  label: string
  sample: string
}

const VARIABLES: InvoiceTemplateVariable[] = [
  {
    id: 'seq',
    label: 'Sequence',
    description:
      'Zero-padded running counter that increments with each invoice.',
    sample: '001',
    arg: { type: 'number', default: 3, min: 1, max: 10 },
  },
  {
    id: 'day',
    label: 'Day',
    description: 'Day of the month, zero-padded (01–31).',
    sample: '07',
    arg: { type: 'none' },
  },
  {
    id: 'month',
    label: 'Month',
    description: 'Month when the invoice is created.',
    sample: '04',
    arg: {
      type: 'enum',
      default: 'num',
      options: [
        { value: 'num', label: 'Number (01–12)', sample: '04' },
        { value: 'short', label: 'Short (Jan–Dec)', sample: 'Apr' },
        { value: 'long', label: 'Long (January–December)', sample: 'April' },
      ],
    },
  },
  {
    id: 'year',
    label: 'Year',
    description: 'Year when the invoice is created.',
    sample: '2026',
    arg: {
      type: 'enum',
      default: 'full',
      options: [
        { value: 'full', label: '4-digit (2026)', sample: '2026' },
        { value: 'short', label: '2-digit (26)', sample: '26' },
      ],
    },
  },
  {
    id: 'hour',
    label: 'Hour',
    description: 'Hour when the invoice is created.',
    sample: '14',
    arg: {
      type: 'enum',
      default: '24',
      options: [
        { value: '24', label: '24-hour (00–23)', sample: '14' },
        { value: '12', label: '12-hour (01–12)', sample: '02' },
      ],
    },
  },
  {
    id: 'min',
    label: 'Minute',
    description: 'Minute when the invoice is created, zero-padded (00–59).',
    sample: '30',
    arg: { type: 'none' },
  },
  {
    id: 'sec',
    label: 'Second',
    description: 'Second when the invoice is created, zero-padded (00–59).',
    sample: '45',
    arg: { type: 'none' },
  },
  {
    id: 'meridiem',
    label: 'AM/PM',
    description: 'Meridiem indicator. Pair with the 12-hour variant of Hour.',
    sample: 'pm',
    arg: { type: 'none' },
  },
]

const TOKEN_PREFIX = '%'
const TOKEN_REGEX = /%(\w+)(?:\(([^)]+)\))?/g

const VARIABLE_MAP = new Map(VARIABLES.map((v) => [v.id, v]))

function buildExpression(
  variable: InvoiceTemplateVariable,
  value?: string | number
): string {
  if (variable.arg.type === 'none') {
    return `${TOKEN_PREFIX}${variable.id}`
  }
  const resolved = value ?? variable.arg.default
  return `${TOKEN_PREFIX}${variable.id}(${resolved})`
}

function formatPart(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  partType: Intl.DateTimeFormatPartTypes,
  timezone?: string
): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...options,
    ...(timezone ? { timeZone: timezone } : {}),
  })
  return (
    formatter.formatToParts(date).find((p) => p.type === partType)?.value ?? ''
  )
}

function resolveToken(
  id: string,
  rawArg: string | undefined,
  date: Date,
  timezone: string | undefined,
  sequence: number
): string | null {
  const variable = VARIABLE_MAP.get(id)
  if (!variable) {
    return null
  }
  const arg =
    rawArg ??
    (variable.arg.type === 'none' ? undefined : String(variable.arg.default))

  switch (id) {
    case 'seq': {
      const digits = Math.max(1, Number(arg) || 0)
      return String(sequence).padStart(digits, '0')
    }
    case 'day':
      return formatPart(date, { day: '2-digit' }, 'day', timezone)
    case 'month': {
      if (arg === 'short' || arg === 'long') {
        return formatPart(date, { month: arg }, 'month', timezone)
      }
      return formatPart(date, { month: '2-digit' }, 'month', timezone)
    }
    case 'year': {
      const full = formatPart(date, { year: 'numeric' }, 'year', timezone)
      return arg === 'short' ? full.slice(-2) : full
    }
    case 'hour': {
      if (arg === '12') {
        const hour = formatPart(
          date,
          { hour: '2-digit', hour12: true },
          'hour',
          timezone
        )
        return hour.padStart(2, '0')
      }
      return formatPart(
        date,
        { hour: '2-digit', hour12: false },
        'hour',
        timezone
      )
    }
    case 'min':
      return formatPart(date, { minute: '2-digit' }, 'minute', timezone)
    case 'sec':
      return formatPart(date, { second: '2-digit' }, 'second', timezone)
    case 'meridiem':
      return formatPart(
        date,
        { hour: '2-digit', hour12: true },
        'dayPeriod',
        timezone
      ).toLowerCase()
    default:
      return null
  }
}

export const InvoiceNumberGeneratorEngine = {
  getAvailableVariables(): InvoiceTemplateVariable[] {
    return VARIABLES
  },
  buildExpression,
  generateInvoiceNumber(
    expression: string,
    options: { sequence?: number; timezone?: string } = {}
  ): string {
    const date = new Date()
    const sequence = options.sequence ?? 1
    return expression.replace(
      TOKEN_REGEX,
      (match, id: string, rawArg?: string) => {
        const resolved = resolveToken(
          id,
          rawArg,
          date,
          options.timezone,
          sequence
        )
        return resolved ?? match
      }
    )
  },
}
