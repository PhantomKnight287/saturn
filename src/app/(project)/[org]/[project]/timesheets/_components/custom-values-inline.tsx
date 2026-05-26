import {
  type CustomFieldDefinition,
  formatCustomFieldValue,
} from '@/lib/custom-fields'

export function CustomValuesInline({
  customFields,
  values,
}: {
  customFields: CustomFieldDefinition[]
  values: Record<string, unknown> | null | undefined
}) {
  if (!values || customFields.length === 0) {
    return null
  }
  const items: { id: string; label: string; value: string }[] = []
  for (const def of customFields) {
    const formatted = formatCustomFieldValue(def, values[def.id])
    if (formatted !== null) {
      items.push({ id: def.id, label: def.label, value: formatted })
    }
  }
  if (items.length === 0) {
    return null
  }
  return (
    <div className='mt-1.5 flex flex-wrap gap-1.5'>
      {items.map((it) => (
        <span
          className='inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] leading-tight'
          key={it.id}
        >
          <span className='text-muted-foreground'>{it.label}</span>
          <span
            className='font-medium text-foreground'
            suppressHydrationWarning
          >
            {it.value}
          </span>
        </span>
      ))}
    </div>
  )
}
