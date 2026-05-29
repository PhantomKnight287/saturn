'use client'

import * as React from 'react'
import { CurrencySelect } from '@/components/ui/currency-selector'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const DEFAULT_FREQUENCIES = [
  'hourly',
  'weekly',
  'biweekly',
  'monthly',
] as const

export const FREQUENCY_LABELS: Record<string, string> = {
  hourly: 'Hourly',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  monthly: 'Monthly',
}

export const FREQUENCY_SHORTHAND: Record<string, string> = {
  hourly: '/h',
  weekly: '/w',
  biweekly: '/bw',
  monthly: '/m',
}

// Only allow numbers with up to two decimal places (or an empty string).
const AMOUNT_PATTERN = /^\d*\.?\d{0,2}$/

/** Format an amount in minor units (cents) into a display string. */
function centsToText(value: number | null | undefined): string {
  if (!value) return ''
  return String(value / 100)
}

export interface RateInputProps {
  /** Amount in minor units (cents). */
  value: number | null | undefined
  /**
   * Called with the amount in cents. Emits `undefined` when the field is
   * cleared and `allowEmpty` is set, otherwise `0`.
   */
  onValueChange: (value: number | undefined) => void
  currency: string | undefined
  onCurrencyChange: (currency: string) => void
  frequency: string
  onFrequencyChange: (frequency: string) => void
  /** Frequency options to offer. Defaults to all billing frequencies. */
  frequencies?: readonly string[]
  /** When true, clearing the input emits `undefined` instead of `0`. */
  allowEmpty?: boolean
  /** Render frequencies as shorthand (`/h`, `/m`) instead of full labels. */
  useFrequencyShorthand?: boolean
  placeholder?: string
  /** Name applied to the currency selector (for forms/labels). */
  name?: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

export function RateInput({
  value,
  onValueChange,
  currency,
  onCurrencyChange,
  frequency,
  onFrequencyChange,
  frequencies = DEFAULT_FREQUENCIES,
  allowEmpty = false,
  useFrequencyShorthand = false,
  placeholder = '0.00',
  name = 'currency',
  disabled,
  invalid,
  className,
}: RateInputProps) {
  // Keep a local string so partial input ("1.", "0.0") and clearing survive
  // the round-trip through cents. We only resync from `value` while the field
  // is not focused (e.g. an external reset), so typing is never interrupted.
  const [text, setText] = React.useState(() => centsToText(value))
  const [focused, setFocused] = React.useState(false)

  React.useEffect(() => {
    if (!focused) setText(centsToText(value))
  }, [value, focused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (raw !== '' && !AMOUNT_PATTERN.test(raw)) return

    setText(raw)

    if (raw === '') {
      onValueChange(allowEmpty ? undefined : 0)
      return
    }

    const parsed = Number(raw)
    if (Number.isNaN(parsed)) return
    onValueChange(Math.round(parsed * 100))
  }

  return (
    <div
      aria-invalid={invalid}
      className={cn(
        'flex h-9 items-stretch overflow-hidden rounded-md border border-input shadow-xs transition-[color,box-shadow]',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      <CurrencySelect
        className='h-full w-auto gap-1 rounded-none border-0 px-3 shadow-none focus-visible:ring-0'
        disabled={disabled}
        name={name}
        onValueChange={onCurrencyChange}
        value={currency}
        variant='small'
      />
      <Input
        className='h-full flex-1 rounded-none border-0 border-input border-x text-right shadow-none focus-visible:ring-0'
        disabled={disabled}
        inputMode='decimal'
        onBlur={() => setFocused(false)}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        value={text}
      />
      <Select
        disabled={disabled}
        onValueChange={onFrequencyChange}
        value={frequency}
      >
        <SelectTrigger className='h-full w-auto rounded-none border-0 shadow-none focus-visible:ring-0'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align='end'>
          {frequencies.map((f) => (
            <SelectItem key={f} value={f}>
              {(useFrequencyShorthand ? FREQUENCY_SHORTHAND : FREQUENCY_LABELS)[
                f
              ] ?? f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
