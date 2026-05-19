'use client'

import DatePicker from './date-picker'
import { Input } from './input'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toLocalParts(iso: string | null | undefined): {
  date: Date | undefined
  time: string
} {
  if (!iso) {
    return { date: undefined, time: '' }
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: undefined, time: '' }
  }
  return {
    date: d,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function combine(date: Date | undefined, time: string): string | null {
  if (!date) {
    return null
  }
  const [hStr, mStr] = (time || '00:00').split(':')
  const h = Number(hStr ?? 0)
  const m = Number(mStr ?? 0)
  if (
    !Number.isInteger(h) ||
    !Number.isInteger(m) ||
    h < 0 ||
    h > 23 ||
    m < 0 ||
    m > 59
  ) {
    return null
  }
  const local = new Date(date)
  local.setHours(h, m, 0, 0)
  return local.toISOString()
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  const { date, time } = toLocalParts(value)
  return (
    <div className='flex gap-2'>
      <div className='flex-1'>
        <DatePicker
          disabled={disabled}
          disablePastDates={false}
          onChange={(d) => onChange(combine(d, time || '00:00'))}
          value={date}
        />
      </div>
      <Input
        className='w-32'
        disabled={disabled}
        onChange={(e) => onChange(combine(date, e.target.value))}
        step={60}
        type='time'
        value={time}
      />
    </div>
  )
}
