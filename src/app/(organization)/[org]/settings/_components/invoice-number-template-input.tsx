'use client'

import { Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  InvoiceNumberGeneratorEngine,
  type InvoiceTemplateVariable,
} from '@/services/invoice-number.service'

type Part =
  | { type: 'text'; value: string }
  | { type: 'token'; id: string; arg?: string }

type EnumSpec = Extract<InvoiceTemplateVariable['arg'], { type: 'enum' }>
type NumberSpec = Extract<InvoiceTemplateVariable['arg'], { type: 'number' }>

const TOKEN_REGEX = /%(\w+)(?:\(([^)]+)\))?/g

function parse(template: string, validIds: Set<string>): Part[] {
  const parts: Part[] = []
  let lastIndex = 0
  for (const match of template.matchAll(TOKEN_REGEX)) {
    const idx = match.index ?? 0
    const id = match[1]!
    if (!validIds.has(id)) {
      continue
    }
    if (idx > lastIndex) {
      parts.push({ type: 'text', value: template.slice(lastIndex, idx) })
    }
    parts.push({ type: 'token', id, arg: match[2] })
    lastIndex = idx + match[0].length
  }
  if (lastIndex < template.length) {
    parts.push({ type: 'text', value: template.slice(lastIndex) })
  }
  return parts
}

function serialize(parts: Part[]): string {
  return parts
    .map((p) => {
      if (p.type === 'text') {
        return p.value
      }
      if (p.arg !== undefined) {
        return `%${p.id}(${p.arg})`
      }
      return `%${p.id}`
    })
    .join('')
}

function normalize(parts: Part[]): Part[] {
  const merged: Part[] = []
  for (const p of parts) {
    const last = merged.at(-1)
    if (p.type === 'text' && last?.type === 'text') {
      last.value += p.value
    } else {
      merged.push({ ...p })
    }
  }
  const withSeps: Part[] = []
  for (let i = 0; i < merged.length; i++) {
    const prev = merged[i - 1]
    const curr = merged[i]!
    if (prev?.type === 'token' && curr.type === 'token') {
      withSeps.push({ type: 'text', value: '' })
    }
    withSeps.push(curr)
  }
  if (withSeps[0]?.type !== 'text') {
    withSeps.unshift({ type: 'text', value: '' })
  }
  if (withSeps.at(-1)?.type !== 'text') {
    withSeps.push({ type: 'text', value: '' })
  }
  return withSeps
}

export function InvoiceNumberTemplateInput({
  value,
  onChange,
  previewSequence = 1,
  timezone,
}: {
  value: string
  onChange: (value: string) => void
  previewSequence?: number
  timezone?: string
}) {
  const variables = useMemo(
    () => InvoiceNumberGeneratorEngine.getAvailableVariables(),
    []
  )
  const variableMap = useMemo(
    () => new Map(variables.map((v) => [v.id, v])),
    [variables]
  )
  const validIds = useMemo(
    () => new Set(variables.map((v) => v.id)),
    [variables]
  )

  const parts = useMemo(
    () => normalize(parse(value, validIds)),
    [value, validIds]
  )

  const preview = useMemo(
    () =>
      InvoiceNumberGeneratorEngine.generateInvoiceNumber(value, {
        sequence: previewSequence,
        timezone,
      }),
    [value, previewSequence, timezone]
  )

  const commit = useCallback(
    (next: Part[]) => {
      onChange(serialize(next))
    },
    [onChange]
  )

  const updatePart = useCallback(
    (index: number, next: Part) => {
      commit(parts.map((p, i) => (i === index ? next : p)))
    },
    [parts, commit]
  )

  const removePart = useCallback(
    (index: number) => {
      commit(parts.filter((_, i) => i !== index))
    },
    [parts, commit]
  )

  const addVariable = useCallback(
    (variable: InvoiceTemplateVariable) => {
      const token: Part = {
        type: 'token',
        id: variable.id,
        arg:
          variable.arg.type === 'none'
            ? undefined
            : String(variable.arg.default),
      }
      commit([...parts, token])
    },
    [parts, commit]
  )

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-center gap-1 rounded-md border bg-background p-2'>
        {parts.map((p, i) => {
          if (p.type === 'text') {
            return (
              <TextSegment
                key={`text-${i}`}
                onChange={(val) => updatePart(i, { type: 'text', value: val })}
                placeholder={i === 0 ? 'prefix' : 'text'}
                value={p.value}
              />
            )
          }
          const variable = variableMap.get(p.id)
          if (!variable) {
            return null
          }
          return (
            <TokenChip
              arg={p.arg}
              key={`token-${i}`}
              onArgChange={(arg) => updatePart(i, { ...p, arg })}
              onRemove={() => removePart(i)}
              variable={variable}
            />
          )
        })}

        <AddVariablePopover onSelect={addVariable} variables={variables} />
      </div>

      <div className='flex items-center gap-2 text-muted-foreground text-xs'>
        <span>Preview:</span>
        <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-foreground'>
          {preview || '—'}
        </code>
      </div>
    </div>
  )
}

function TextSegment({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const width = `${Math.max(value.length, placeholder.length) + 1}ch`
  return (
    <input
      aria-label={placeholder}
      className='h-7 rounded border-0 bg-transparent px-1 font-mono text-sm outline-none placeholder:text-muted-foreground/50 focus:bg-muted/50'
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width }}
      value={value}
    />
  )
}

function TokenChip({
  variable,
  arg,
  onArgChange,
  onRemove,
}: {
  variable: InvoiceTemplateVariable
  arg?: string
  onArgChange: (arg: string) => void
  onRemove: () => void
}) {
  return (
    <span className='inline-flex h-7 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 pr-1 pl-2 text-primary text-xs'>
      <span className='font-medium'>{variable.label}</span>
      {variable.arg.type === 'enum' && (
        <EnumArgControl
          onChange={onArgChange}
          spec={variable.arg}
          value={arg ?? variable.arg.default}
        />
      )}
      {variable.arg.type === 'number' && (
        <NumberArgControl
          onChange={onArgChange}
          spec={variable.arg}
          value={arg ?? String(variable.arg.default)}
        />
      )}
      <button
        aria-label={`Remove ${variable.label}`}
        className='rounded p-0.5 hover:bg-primary/20'
        onClick={onRemove}
        type='button'
      >
        <X className='size-3' />
      </button>
    </span>
  )
}

function EnumArgControl({
  spec,
  value,
  onChange,
}: {
  spec: EnumSpec
  value: string
  onChange: (arg: string) => void
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className='h-5 gap-0.5 border-0 bg-transparent! px-1.5 text-primary text-xs shadow-none focus-visible:ring-0'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {spec.options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NumberArgControl({
  spec,
  value,
  onChange,
}: {
  spec: NumberSpec
  value: string
  onChange: (arg: string) => void
}) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleChange = (raw: string) => {
    setDraft(raw)
    if (raw === '') {
      return
    }
    const num = Number(raw)
    if (!Number.isFinite(num) || num < spec.min || num > spec.max) {
      return
    }
    const str = String(num)
    if (str !== value) {
      onChange(str)
    }
  }

  const handleBlur = () => {
    const num = Number(draft)
    if (draft === '' || !Number.isFinite(num)) {
      setDraft(value)
      return
    }
    const clamped = Math.min(spec.max, Math.max(spec.min, num))
    const str = String(clamped)
    setDraft(str)
    if (str !== value) {
      onChange(str)
    }
  }

  return (
    <input
      className='w-10 rounded bg-primary/10 px-1 text-center text-primary text-xs outline-none [appearance:textfield] focus:bg-primary/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
      max={spec.max}
      min={spec.min}
      onBlur={handleBlur}
      onChange={(e) => handleChange(e.target.value)}
      type='number'
      value={draft}
    />
  )
}

function AddVariablePopover({
  variables,
  onSelect,
}: {
  variables: InvoiceTemplateVariable[]
  onSelect: (variable: InvoiceTemplateVariable) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button className='h-7 gap-1 text-xs' size='sm' variant='ghost'>
          <Plus className='size-3' />
          Add variable
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-80 p-1'>
        <ul className='max-h-72 overflow-auto'>
          {variables.map((v) => (
            <li key={v.id}>
              <button
                className='flex w-full flex-col items-start gap-0.5 rounded-sm px-2 py-1.5 text-left hover:bg-accent'
                onClick={() => {
                  onSelect(v)
                  setOpen(false)
                }}
                type='button'
              >
                <span className='flex items-center gap-2'>
                  <span className='font-medium text-sm'>{v.label}</span>
                  <code className='rounded bg-muted px-1 font-mono text-muted-foreground text-xs'>
                    {v.sample}
                  </code>
                </span>
                <span className='text-muted-foreground text-xs leading-snug'>
                  {v.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
