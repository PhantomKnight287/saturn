export function MockExpenseCard() {
  const items = [
    { label: 'Figma — annual', amount: '180', cat: 'Software' },
    { label: 'Client lunch', amount: '64', cat: 'Meals' },
    { label: 'Domain renewal', amount: '14', cat: 'Hosting' },
  ]
  return (
    <div className='flex h-full flex-col justify-end'>
      <div className='flex items-baseline justify-between'>
        <div>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
            April expenses
          </div>
          <div className='mt-1 font-semibold text-3xl text-foreground tabular-nums tracking-[-0.03em]'>
            $258
          </div>
        </div>
        <span className='rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary uppercase tracking-wider'>
          Billable
        </span>
      </div>
      <div className='mt-4 space-y-1 border-border/60 border-t pt-3'>
        {items.map((l) => (
          <div
            className='flex items-center justify-between gap-2 text-xs'
            key={l.label}
          >
            <span className='truncate text-muted-foreground'>{l.label}</span>
            <span className='flex items-center gap-2'>
              <span className='font-mono text-[10px] text-muted-foreground/70 uppercase tracking-wider'>
                {l.cat}
              </span>
              <span className='w-10 text-right font-mono text-foreground/80 tabular-nums'>
                ${l.amount}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
