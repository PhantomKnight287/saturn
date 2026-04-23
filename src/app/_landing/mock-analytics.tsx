export function MockAnalytics() {
  const bars = [
    { id: 'mon', h: 32, label: 'M' },
    { id: 'tue', h: 54, label: 'T' },
    { id: 'wed', h: 44, label: 'W' },
    { id: 'thu', h: 68, label: 'T' },
    { id: 'fri', h: 82, label: 'F' },
    { id: 'sat', h: 22, label: 'S' },
    { id: 'sun', h: 12, label: 'S' },
  ]
  return (
    <div className='flex h-full flex-col justify-end'>
      <div className='flex items-baseline justify-between'>
        <div>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
            MTD revenue
          </div>
          <div className='mt-1 font-semibold text-4xl text-foreground tabular-nums tracking-[-0.03em]'>
            $12,480
          </div>
        </div>
      </div>
      <div className='mt-5 flex h-14 items-end gap-1.5'>
        {bars.map((b) => (
          <div className='flex flex-1 flex-col items-center gap-1.5' key={b.id}>
            <div
              className='w-full rounded-sm bg-linear-to-b from-primary to-primary/60'
              style={{ height: `${b.h}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
