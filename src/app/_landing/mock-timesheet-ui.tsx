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
    <div className='overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1a1f] shadow-2xl shadow-violet-500/10'>
      <div className='flex items-center justify-between border-white/[0.06] border-b bg-white/[0.03] px-5 py-3'>
        <div className='flex items-center gap-2'>
          <Clock className='size-4 text-violet-400' />
          <span className='font-semibold text-sm text-white/90'>
            Timesheets
          </span>
        </div>
        <span className='text-white/40 text-xs'>Apr 1 – Apr 7</span>
      </div>
      <div className='divide-y divide-white/[0.04]'>
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
              <div className='text-sm text-white/80'>{e.task}</div>
              <div className='text-[11px] text-white/30'>{e.req}</div>
            </div>
            <span className='font-mono text-sm text-white/60'>{e.hours}</span>
          </div>
        ))}
      </div>
      <div className='flex items-center justify-between border-white/[0.06] border-t bg-white/[0.02] px-5 py-3'>
        <span className='text-white/40 text-xs'>Total</span>
        <span className='font-mono font-semibold text-sm text-violet-300'>
          11.0h
        </span>
      </div>
    </div>
  )
}
