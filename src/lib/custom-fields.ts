import { z } from 'zod'

export const CUSTOM_FIELD_TYPES = [
  'text',
  'number',
  'select',
  'checkbox',
  'date',
  'datetime',
  'time',
] as const

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export const TEMPORAL_TYPES = ['date', 'datetime', 'time'] as const

export function isTemporalType(t: CustomFieldType): boolean {
  return t === 'date' || t === 'datetime' || t === 'time'
}

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
  datetime: 'Date & time',
  time: 'Time',
}

export interface CustomFieldConfig {
  max?: number
  maxLength?: number
  min?: number
}

export interface CustomFieldDefinition {
  config: CustomFieldConfig | null
  createdAt: Date
  defaultValue: string | null
  id: string
  label: string
  options: string[] | null
  organizationId: string
  projectId: string | null
  required: boolean
  type: CustomFieldType
  visibleToClient: boolean
}

const labelSchema = z.string().trim().min(1, 'Label is required').max(100)

const configSchema = z
  .object({
    maxLength: z.number().int().positive().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .refine((c) => c.min == null || c.max == null || c.min <= c.max, {
    message: 'Min must be less than or equal to Max',
    path: ['min'],
  })
  .nullable()
  .optional()

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidDateString(s: string): boolean {
  const m = DATE_RE.exec(s)
  if (!m) {
    return false
  }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1) {
    return false
  }
  const daysInMonth = new Date(year, month, 0).getDate()
  return day <= daysInMonth
}

export function isValidTimeString(s: string): boolean {
  return TIME_RE.test(s)
}

/**
 * Parse a YYYY-MM-DD string as a local-time Date (midnight in the runtime's
 * timezone). `new Date("YYYY-MM-DD")` parses as UTC, which can shift the day
 * for users west of UTC.
 */
export function parseDateOnlyAsLocal(s: string): Date | null {
  const m = DATE_RE.exec(s)
  if (!m) {
    return null
  }
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!isValidDateString(s)) {
    return null
  }
  return new Date(year, month - 1, day)
}

export function formatLocalDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function validateDefinitionCrossFields(
  data: {
    type: CustomFieldType
    options?: string[] | null
    defaultValue?: string | null
  },
  ctx: z.RefinementCtx
) {
  if (data.type === 'select') {
    if (!data.options || data.options.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'At least one option is required for a select field.',
      })
      return
    }
    const set = new Set(data.options.map((o) => o.toLowerCase()))
    if (set.size !== data.options.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Options must be unique.',
      })
    }
    if (
      data.defaultValue != null &&
      !data.options.includes(data.defaultValue)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultValue'],
        message: 'Default must be one of the configured options.',
      })
    }
  }
  if (data.type !== 'select' && data.options && data.options.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are only allowed for select fields.',
    })
  }
  if (
    data.type === 'date' &&
    data.defaultValue != null &&
    data.defaultValue !== 'today' &&
    !isValidDateString(data.defaultValue)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['defaultValue'],
      message: "Default must be a valid YYYY-MM-DD date or 'today'.",
    })
  }
  if (
    data.type === 'time' &&
    data.defaultValue != null &&
    data.defaultValue !== 'now' &&
    !isValidTimeString(data.defaultValue)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['defaultValue'],
      message: "Default must be a valid HH:MM time or 'now'.",
    })
  }
  if (
    data.type === 'datetime' &&
    data.defaultValue != null &&
    data.defaultValue !== 'now' &&
    Number.isNaN(Date.parse(data.defaultValue))
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['defaultValue'],
      message: "Default must be a valid datetime or 'now'.",
    })
  }
}

export const customFieldDefinitionCreateSchema = z
  .object({
    label: labelSchema,
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean().default(false),
    visibleToClient: z.boolean().default(false),
    defaultValue: z.string().nullable().optional(),
    options: z.array(z.string().trim().min(1).max(100)).nullable().optional(),
    config: configSchema,
  })
  .superRefine(validateDefinitionCrossFields)

export const customFieldDefinitionUpdateSchema = z
  .object({
    label: labelSchema,
    type: z.enum(CUSTOM_FIELD_TYPES),
    required: z.boolean(),
    visibleToClient: z.boolean(),
    defaultValue: z.string().nullable().optional(),
    options: z.array(z.string().trim().min(1).max(100)).nullable().optional(),
    config: configSchema,
  })
  .superRefine(validateDefinitionCrossFields)

export function resolveDefault(
  def: Pick<CustomFieldDefinition, 'type' | 'defaultValue'>,
  now: Date = new Date()
): unknown {
  if (def.defaultValue == null) {
    return def.type === 'checkbox' ? false : null
  }
  if (def.type === 'date' && def.defaultValue === 'today') {
    return formatLocalDateOnly(now)
  }
  if (def.type === 'time' && def.defaultValue === 'now') {
    const h = String(now.getHours()).padStart(2, '0')
    const m = String(now.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  if (def.type === 'datetime' && def.defaultValue === 'now') {
    return now.toISOString()
  }
  if (def.type === 'checkbox') {
    return def.defaultValue === 'true'
  }
  if (def.type === 'number') {
    const n = Number(def.defaultValue)
    return Number.isFinite(n) ? n : null
  }
  return def.defaultValue
}

function valueSchemaFor(def: CustomFieldDefinition) {
  switch (def.type) {
    case 'text': {
      let s = z.string()
      if (def.config?.maxLength) {
        s = s.max(def.config.maxLength)
      } else {
        s = s.max(500)
      }
      return def.required ? s.min(1, `${def.label} is required`) : s.optional()
    }
    case 'number': {
      let n = z.number()
      if (def.config?.min != null) {
        n = n.min(def.config.min)
      }
      if (def.config?.max != null) {
        n = n.max(def.config.max)
      }
      return def.required ? n : n.optional().nullable()
    }
    case 'select': {
      const opts = def.options ?? []
      if (opts.length === 0) {
        return z.never().optional()
      }
      const e = z.enum(opts as [string, ...string[]])
      return def.required ? e : e.optional().nullable()
    }
    case 'checkbox':
      return z.boolean().default(false)
    case 'date': {
      const s = z
        .string()
        .refine(isValidDateString, { message: 'Invalid date' })
      return def.required
        ? s.min(1, `${def.label} is required`)
        : s.optional().nullable()
    }
    case 'time': {
      const s = z
        .string()
        .refine(isValidTimeString, { message: 'Invalid time' })
      return def.required
        ? s.min(1, `${def.label} is required`)
        : s.optional().nullable()
    }
    case 'datetime': {
      const s = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
        message: 'Invalid datetime',
      })
      return def.required ? s : s.optional().nullable()
    }
    default:
      return z.unknown().optional()
  }
}

export function buildCustomValuesSchema(defs: CustomFieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const def of defs) {
    shape[def.id] = valueSchemaFor(def) as z.ZodTypeAny
  }
  return z.object(shape).transform((obj) => {
    const out: Record<string, unknown> = {}
    for (const def of defs) {
      const v = (obj as Record<string, unknown>)[def.id]
      if (v != null && v !== '') {
        out[def.id] = v
      }
    }
    return out
  })
}

// ---------- display helpers ----------

export function normalizeCustomFieldLabel(label: string): string {
  return label.trim().toLowerCase()
}

export function formatCustomFieldValue(
  def: CustomFieldDefinition,
  raw: unknown
): string | null {
  if (raw == null || raw === '') {
    return null
  }
  switch (def.type) {
    case 'checkbox':
      return raw ? 'Yes' : 'No'
    case 'date': {
      const local = parseDateOnlyAsLocal(String(raw))
      if (!local) {
        return String(raw)
      }
      return local.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
    case 'datetime': {
      const d = new Date(raw as string)
      if (Number.isNaN(d.getTime())) {
        return String(raw)
      }
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    }
    default:
      return String(raw)
  }
}

// ---------- editor-form helpers ----------

export interface CustomFieldFormValues {
  config?: CustomFieldConfig | null
  defaultValue?: string | null
  label: string
  options?: { value: string }[]
  required: boolean
  type: CustomFieldType
  useCurrent: boolean
  visibleToClient: boolean
}

export interface CustomFieldInitial {
  config?: CustomFieldConfig | null
  defaultValue?: string | null
  label?: string
  options?: string[] | null
  required?: boolean
  type?: CustomFieldType
  visibleToClient?: boolean
}

export function toCustomFieldFormValues(
  initial?: CustomFieldInitial
): CustomFieldFormValues {
  const def = initial?.defaultValue ?? null
  const isSentinel = def === 'today' || def === 'now'
  return {
    label: initial?.label ?? '',
    type: initial?.type ?? 'text',
    required: initial?.required ?? false,
    visibleToClient: initial?.visibleToClient ?? false,
    defaultValue: isSentinel ? null : def,
    options: (initial?.options ?? []).map((value) => ({ value })),
    config: initial?.config ?? null,
    useCurrent: isSentinel,
  }
}

export interface CustomFieldSubmitPayload {
  config: CustomFieldConfig | null
  defaultValue: string | null
  label: string
  options: string[] | null
  required: boolean
  type: CustomFieldType
  visibleToClient: boolean
}

export function toSubmittableCustomFieldPayload(
  values: CustomFieldFormValues
): CustomFieldSubmitPayload {
  let defaultValue: string | null = null
  if (values.useCurrent && isTemporalType(values.type)) {
    defaultValue = values.type === 'date' ? 'today' : 'now'
  } else if (values.defaultValue != null && values.defaultValue !== '') {
    defaultValue = values.defaultValue
  }

  return {
    label: values.label.trim(),
    type: values.type,
    required: values.required,
    visibleToClient: values.visibleToClient,
    defaultValue,
    options:
      values.type === 'select'
        ? (values.options ?? []).map((o) => o.value.trim()).filter(Boolean)
        : null,
    config: values.config ?? null,
  }
}
