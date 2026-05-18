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

export interface CustomFieldDefinition {
  config: { maxLength?: number; min?: number; max?: number } | null
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
  .nullable()
  .optional()

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
  .superRefine((data, ctx) => {
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
      !/^\d{4}-\d{2}-\d{2}$/.test(data.defaultValue)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultValue'],
        message: "Default must be a YYYY-MM-DD date or 'today'.",
      })
    }
    if (
      data.type === 'time' &&
      data.defaultValue != null &&
      data.defaultValue !== 'now' &&
      !/^\d{2}:\d{2}$/.test(data.defaultValue)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultValue'],
        message: "Default must be a HH:MM time or 'now'.",
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
  })

export const customFieldDefinitionUpdateSchema = z
  .object({
    label: labelSchema,
    required: z.boolean(),
    visibleToClient: z.boolean(),
    defaultValue: z.string().nullable().optional(),
    options: z.array(z.string().trim().min(1).max(100)).nullable().optional(),
    config: configSchema,
  })
  .passthrough()

export function resolveDefault(
  def: Pick<CustomFieldDefinition, 'type' | 'defaultValue'>,
  now: Date = new Date()
): unknown {
  if (def.defaultValue == null) {
    return def.type === 'checkbox' ? false : null
  }
  if (def.type === 'date' && def.defaultValue === 'today') {
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
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
      const s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
      return def.required
        ? s.min(1, `${def.label} is required`)
        : s.optional().nullable()
    }
    case 'time': {
      const s = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time')
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
