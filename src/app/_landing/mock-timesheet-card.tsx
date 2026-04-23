export function MockTimesheetCard() {
  const days = [
    { day: 'Mon', hours: 4.5 },
    { day: 'Tue', hours: 7.0 },
    { day: 'Wed', hours: 5.5 },
    { day: 'Thu', hours: 8.25 },
    { day: 'Fri', hours: 6.0 },
  ]
  const max = 8.25
  return (
    <div className='flex h-full flex-col justify-end'>
      <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
        Apr 14 – 18
      </div>
      <div className='mt-3 space-y-1.5'>
        {days.map((d) => (
          <div className='flex items-center gap-2' key={d.day}>
            <span className='w-8 font-mono text-[11px] text-muted-foreground/80'>
              {d.day}
            </span>
            <div className='relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60'>
              <div
                className='absolute inset-y-0 left-0 rounded-full bg-primary'
                style={{ width: `${(d.hours / max) * 100}%` }}
              />
            </div>
            <span className='w-10 text-right font-mono text-[11px] text-foreground/80 tabular-nums'>
              {d.hours.toFixed(1)}h
            </span>
          </div>
        ))}
      </div>
      <div className='mt-4 flex items-baseline justify-between border-border/60 border-t pt-3'>
        <span className='text-muted-foreground text-xs'>Total</span>
        <span className='font-medium font-mono text-foreground text-sm tabular-nums'>
          31.25h
        </span>
      </div>
    </div>
  )
}
