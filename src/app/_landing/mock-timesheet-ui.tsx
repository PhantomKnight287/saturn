import { Clock } from 'lucide-react'
import Image from 'next/image'

const entries = [
  {
    task: 'Hero section implementation',
    req: 'Landing Page',
    hours: '3.5h',
    member: 'SK',
  },
  {
    task: 'API endpoint for auth',
    req: 'Authentication',
    hours: '2.0h',
    member: 'JD',
  },
  {
    task: 'Invoice PDF template',
    req: 'Billing',
    hours: '4.0h',
    member: 'SK',
  },
  {
    task: 'Database schema design',
    req: 'Data Layer',
    hours: '1.5h',
    member: 'AR',
  },
]

export function MockTimesheetUI() {
  return (
    <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10'>
      <div className='flex items-center justify-between border-border/60 border-b bg-muted/30 px-5 py-3'>
        <div className='flex items-center gap-2'>
          <Clock className='size-4 text-primary' />
          <span className='font-semibold text-foreground text-sm'>
            Timesheets
          </span>
        </div>
        <span className='text-muted-foreground text-xs'>Apr 1 – Apr 7</span>
      </div>
      <div className='divide-y divide-border/50'>
        {entries.map((e) => (
          <div className='flex items-center gap-3 px-5 py-3' key={e.task}>
            <Image
              alt=''
              className='size-6 rounded-full'
              height={24}
              src={
                e.member === 'SK' || e.member === 'AR'
                  ? 'https://github.com/phantomknight287.png'
                  : 'https://github.com/loremus299.png'
              }
              width={24}
            />
            <div className='flex-1'>
              <div className='text-foreground/80 text-sm'>{e.task}</div>
              <div className='text-[11px] text-muted-foreground/70'>
                {e.req}
              </div>
            </div>
            <span className='font-mono text-muted-foreground text-sm'>
              {e.hours}
            </span>
          </div>
        ))}
      </div>
      <div className='flex items-center justify-between border-border/60 border-t bg-muted/20 px-5 py-3'>
        <span className='text-muted-foreground text-xs'>Total</span>
        <span className='font-mono font-semibold text-primary text-sm'>
          11.0h
        </span>
      </div>
    </div>
  )
}
