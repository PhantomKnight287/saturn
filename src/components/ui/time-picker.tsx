'use client'

import { Input } from './input'

export function TimePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null | undefined
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  return (
    <Input
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : v)
      }}
      step={60}
      type='time'
      value={value ?? ''}
    />
  )
}
