export function MockInvoiceCard() {
  const lines = [
    { label: 'Design — 12h', amount: '1,800' },
    { label: 'Frontend — 18h', amount: '2,700' },
    { label: 'Hosting', amount: '120' },
  ]
  return (
    <div className='flex h-full flex-col justify-end'>
      <div className='flex items-baseline justify-between'>
        <div>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
            Invoice #0042
          </div>
          <div className='mt-1 font-semibold text-3xl text-foreground tabular-nums tracking-[-0.03em]'>
            $4,620
          </div>
        </div>
        <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-600 uppercase tracking-wider dark:text-emerald-400'>
          Paid
        </span>
      </div>
      <div className='mt-4 space-y-1 border-border/60 border-t pt-3'>
        {lines.map((l) => (
          <div
            className='flex items-center justify-between text-xs'
            key={l.label}
          >
            <span className='text-muted-foreground'>{l.label}</span>
            <span className='font-mono text-foreground/80 tabular-nums'>
              ${l.amount}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
