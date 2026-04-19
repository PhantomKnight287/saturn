import { FileSpreadsheet } from 'lucide-react'

export function MockInvoiceUI() {
  return (
    <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10'>
      <div className='flex items-center justify-between border-border/60 border-b bg-muted/30 px-5 py-3'>
        <div className='flex items-center gap-2'>
          <FileSpreadsheet className='size-4 text-primary' />
          <span className='font-semibold text-foreground text-sm'>
            Invoice #0042
          </span>
        </div>
        <span className='rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-[10px] text-emerald-600 dark:text-emerald-400'>
          Paid
        </span>
      </div>
      <div className='p-5'>
        <div className='mb-4 grid grid-cols-2 gap-4'>
          <div>
            <div className='text-[10px] text-muted-foreground/70 uppercase tracking-wider'>
              Billed to
            </div>
            <div className='mt-1 text-foreground/80 text-sm'>
              Globex Corporation
            </div>
          </div>
          <div className='text-right'>
            <div className='text-[10px] text-muted-foreground/70 uppercase tracking-wider'>
              Amount
            </div>
            <div className='mt-1 font-semibold text-foreground text-lg'>
              $4,250.00
            </div>
          </div>
        </div>
        <div className='space-y-2'>
          {[
            { item: 'UI/UX Design — Landing Page', amount: '$1,750.00' },
            { item: 'Frontend Development (12h)', amount: '$2,100.00' },
            { item: 'Hosting & Domain Setup', amount: '$400.00' },
          ].map((line) => (
            <div
              className='flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2'
              key={line.item}
            >
              <span className='text-muted-foreground text-xs'>{line.item}</span>
              <span className='font-mono text-muted-foreground/80 text-xs'>
                {line.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
