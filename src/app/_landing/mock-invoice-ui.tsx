import { FileSpreadsheet } from 'lucide-react'

export function MockInvoiceUI() {
  return (
    <div className='overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1f] shadow-2xl shadow-violet-500/10'>
      <div className='flex items-center justify-between border-white/[0.06] border-b bg-white/[0.03] px-5 py-3'>
        <div className='flex items-center gap-2'>
          <FileSpreadsheet className='size-4 text-violet-400' />
          <span className='font-semibold text-sm text-white/90'>
            Invoice #0042
          </span>
        </div>
        <span className='rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-[10px] text-emerald-400'>
          Paid
        </span>
      </div>
      <div className='p-5'>
        <div className='mb-4 grid grid-cols-2 gap-4'>
          <div>
            <div className='text-[10px] text-white/30 uppercase tracking-wider'>
              Billed to
            </div>
            <div className='mt-1 text-sm text-white/80'>Globex Corporation</div>
          </div>
          <div className='text-right'>
            <div className='text-[10px] text-white/30 uppercase tracking-wider'>
              Amount
            </div>
            <div className='mt-1 font-semibold text-lg text-white/90'>
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
              className='flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2'
              key={line.item}
            >
              <span className='text-white/60 text-xs'>{line.item}</span>
              <span className='font-mono text-white/50 text-xs'>
                {line.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
