import { Check } from 'lucide-react'

export function MockProposalCard() {
  const sections = [
    { label: 'Scope of work', done: true },
    { label: 'Deliverables', done: true },
    { label: 'Timeline & milestones', done: true },
    { label: 'Pricing', done: true },
    { label: 'Client signature', done: false },
  ]
  return (
    <div className='flex h-full flex-col justify-end'>
      <div className='flex items-baseline justify-between'>
        <div>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-wider'>
            Proposal — Acme Co.
          </div>
          <div className='mt-1 font-semibold text-2xl text-foreground tracking-[-0.03em]'>
            Website redesign, Q2
          </div>
        </div>
        <span className='rounded-full bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-600 uppercase tracking-wider dark:text-amber-400'>
          Sent to sign
        </span>
      </div>
      <div className='mt-4 space-y-2 border-border/60 border-t pt-3'>
        {sections.map((s) => (
          <div className='flex items-center gap-2 text-xs' key={s.label}>
            <span
              className={`flex size-4 items-center justify-center rounded-full ${
                s.done
                  ? 'bg-primary/15 text-primary'
                  : 'border border-muted-foreground/40 border-dashed text-muted-foreground/60'
              }`}
            >
              {s.done && <Check className='size-2.5' strokeWidth={3} />}
            </span>
            <span
              className={
                s.done ? 'text-foreground/80' : 'text-muted-foreground'
              }
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
