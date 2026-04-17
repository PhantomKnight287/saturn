/** biome-ignore-all lint/correctness/useUniqueElementIds: Need em to score to the section in home page */

import {
  ArrowRight,
  Check,
  Code,
  Eye,
  Lock,
  MessageSquare,
  Palette,
  Pen,
  PenTool,
  Send,
  Users,
  Video,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { SaturnLogo } from '@/components/icons/saturn-logo'
import { buttonVariants } from '@/components/ui/button'
import { createMetadata } from '@/lib/metadata'
import {
  capabilities,
  clientFeatures,
  freelancerTypes,
  freePlanFeatures,
  proPlanFeatures,
  roles,
  workflowSteps,
} from './_landing/data'
import { DotPattern } from './_landing/dot-pattern'
import { LandingNav } from './_landing/landing-nav'
import { MockAppUI } from './_landing/mock-app-ui'
import { MockInvoiceUI } from './_landing/mock-invoice-ui'
import { MockRequirementUI } from './_landing/mock-requirement-ui'
import { MockTimesheetUI } from './_landing/mock-timesheet-ui'

const freelancerIcons = { Code, Palette, Video, Users } as const
const clientIcons = { Eye, PenTool, MessageSquare, Lock } as const

export const metadata: Metadata = createMetadata({
  description:
    'Saturn brings projects, timesheets, invoices, and client management into one place — the operating system for your freelance business.',
  openGraph: {
    images: ['/api/og?page=Saturn'],
  },
  twitter: {
    images: ['/api/og?page=Saturn'],
  },
})

export default function LandingPage() {
  return (
    <div className='min-h-svh w-full bg-background text-foreground'>
      <LandingNav />

      <section className='relative overflow-hidden'>
        <DotPattern className='pointer-events-none absolute inset-0 opacity-40' />
        <div className='relative mx-auto grid max-w-7xl gap-16 px-6 pt-20 pb-20 lg:grid-cols-2 lg:gap-12 lg:pt-28'>
          <div className='flex flex-col justify-center'>
            <h1 className='text-center font-bold text-4xl tracking-tight md:text-left lg:text-5xl'>
              The operating system for your freelance business
            </h1>
            <p className='mt-5 max-w-lg text-center text-lg text-muted-foreground leading-relaxed md:text-left'>
              Saturn brings projects, timesheets, invoices, and client
              management into one place. No more spreadsheets. No more chasing
              emails. Just open Saturn and get to work.
            </p>
            <div className='mt-8 flex items-center justify-center gap-3 md:justify-start'>
              <Link
                className={buttonVariants({ size: 'lg' })}
                href='/auth/sign-up'
              >
                Start for free
                <ArrowRight className='size-4' />
              </Link>
              <Link
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
                href='#how-it-works'
              >
                See how it works
              </Link>
            </div>
          </div>
          <div className='relative lg:pt-4'>
            <MockAppUI />
          </div>
        </div>
      </section>

      <section className='border-border border-y bg-secondary/40'>
        <div className='mx-auto max-w-7xl px-6 py-24'>
          <div className='mb-14'>
            <h2 className='font-bold text-3xl tracking-tight'>
              What you can do with Saturn
            </h2>
            <p className='mt-2 max-w-lg text-muted-foreground'>
              Six modules that cover the full lifecycle of a freelance project.
            </p>
          </div>
          <div className='grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3'>
            {capabilities.map((cap) => (
              <div className='bg-card p-6' key={cap.title}>
                <cap.icon className='mb-3 size-5 text-primary' />
                <h3 className='mb-1.5 font-semibold'>{cap.title}</h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='relative' id='how-it-works'>
        <DotPattern className='pointer-events-none absolute inset-0 opacity-30' />
        <div className='relative mx-auto max-w-7xl px-6 py-24'>
          <div className='mb-14'>
            <h2 className='font-bold text-3xl tracking-tight'>
              From tracked hours to paid invoices
            </h2>
            <p className='mt-2 max-w-lg text-muted-foreground'>
              Log time against requirements. Generate invoices from that data.
              Send them to clients. Done.
            </p>
          </div>
          <div className='grid gap-10 lg:grid-cols-2 lg:gap-16'>
            <MockTimesheetUI />
            <MockInvoiceUI />
          </div>
          <div className='mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3'>
            {workflowSteps.map((s) => (
              <div className='bg-card p-6' key={s.step}>
                <span className='mb-3 inline-block font-mono text-primary text-xs'>
                  {s.step}
                </span>
                <h3 className='mb-1.5 font-semibold'>{s.title}</h3>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='border-border border-y bg-secondary/40'>
        <div className='mx-auto max-w-7xl px-6 py-24'>
          <div className='grid gap-16 lg:grid-cols-2'>
            <div>
              <h2 className='font-bold text-3xl tracking-tight'>
                Write requirements. Get them signed.
              </h2>
              <p className='mt-3 max-w-md text-muted-foreground'>
                Saturn has a full rich-text editor for writing project
                requirements. When they&apos;re ready, send them to your client
                for review. Clients can request changes, leave threaded
                comments, or sign off with a digital signature — all without
                leaving Saturn.
              </p>
              <div className='mt-8 space-y-4'>
                {[
                  {
                    icon: Pen,
                    text: 'Write requirements with a rich-text editor — images, code blocks, and all',
                  },
                  {
                    icon: Send,
                    text: "Send to clients for review when you're ready",
                  },
                  {
                    icon: MessageSquare,
                    text: 'Clients leave threaded comments or request changes inline',
                  },
                  {
                    icon: PenTool,
                    text: 'Collect digital signatures once requirements are approved',
                  },
                ].map((item) => (
                  <div className='flex gap-3' key={item.text}>
                    <item.icon className='mt-0.5 size-4 shrink-0 text-primary' />
                    <span className='text-muted-foreground text-sm'>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <MockRequirementUI />
          </div>
        </div>
      </section>

      <section>
        <div className='mx-auto max-w-7xl px-6 py-24'>
          <h2 className='font-bold text-3xl tracking-tight'>
            Roles that match how teams actually work
          </h2>
          <p className='mt-3 max-w-lg text-muted-foreground'>
            Four roles with fine-grained permissions. Your team sees exactly
            what they need — nothing more. Clients register on the same platform
            with scoped access to their assigned projects.
          </p>
          <div className='mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4'>
            {roles.map((r) => (
              <div className='bg-card p-6' key={r.role}>
                <div className='mb-1 font-semibold'>{r.role}</div>
                <p className='text-muted-foreground text-sm'>{r.desc}</p>
                <div className='mt-4 space-y-1.5'>
                  {r.permissions.map((p) => (
                    <div
                      className='flex items-center gap-2 text-muted-foreground text-xs'
                      key={p}
                    >
                      <Check className='size-3 text-primary' />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className='relative border-border border-y bg-secondary/40'>
        <DotPattern className='pointer-events-none absolute inset-0 opacity-30' />
        <div className='relative mx-auto max-w-7xl px-6 py-24'>
          <h2 className='font-bold text-3xl tracking-tight'>
            Built for every kind of freelancer
          </h2>
          <p className='mt-3 max-w-lg text-muted-foreground'>
            Whether you&apos;re a solo developer or a design agency with 20
            people, Saturn adapts to how you work.
          </p>
          <div className='mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
            {freelancerTypes.map((cat) => {
              const Icon = freelancerIcons[cat.iconName]
              return (
                <div
                  className='rounded-xl border border-border bg-card p-5'
                  key={cat.title}
                >
                  <Icon className='mb-3 size-5 text-primary' />
                  <h3 className='mb-3 font-semibold'>{cat.title}</h3>
                  <ul className='space-y-2'>
                    {cat.points.map((point) => (
                      <li
                        className='flex gap-2 text-muted-foreground text-sm'
                        key={point}
                      >
                        <span className='mt-1.5 size-1 shrink-0 rounded-full bg-primary' />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section>
        <div className='mx-auto max-w-7xl px-6 py-24'>
          <h2 className='font-bold text-3xl tracking-tight'>
            Your clients use the same platform
          </h2>
          <p className='mt-3 max-w-lg text-muted-foreground'>
            No separate portal. Clients register on Saturn and get invited to
            your projects. Their role scopes what they can see — milestone
            progress, requirements to sign, invoices to review — while your
            internal timesheets and team rates stay private.
          </p>
          <div className='mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4'>
            {clientFeatures.map((item) => {
              const Icon = clientIcons[item.iconName]
              return (
                <div className='bg-card p-5' key={item.title}>
                  <Icon className='mb-2 size-4 text-primary' />
                  <div className='mb-1 font-semibold text-sm'>{item.title}</div>
                  <p className='text-muted-foreground text-xs leading-relaxed'>
                    {item.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section
        className='relative border-border border-y bg-secondary/40'
        id='pricing'
      >
        <DotPattern className='pointer-events-none absolute inset-0 opacity-30' />
        <div className='relative mx-auto max-w-4xl px-6 py-24'>
          <div className='mb-14 text-center'>
            <h2 className='font-bold text-3xl tracking-tight'>
              Simple pricing. No per-seat nonsense.
            </h2>
            <p className='mt-3 text-muted-foreground'>
              Every feature works on Free. Pro removes limits and adds API
              access for teams that want to automate.
            </p>
          </div>
          <div className='grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2'>
            <div className='flex flex-col bg-card p-8'>
              <div className='mb-1 font-semibold text-lg'>Free</div>
              <div className='mb-4 flex items-baseline gap-1'>
                <span className='font-bold text-3xl tracking-tight'>$0</span>
                <span className='text-muted-foreground text-sm'>/ forever</span>
              </div>
              <p className='mb-6 text-muted-foreground text-sm'>
                Everything you need to manage a small freelance practice.
              </p>
              <div className='mb-8 space-y-3'>
                {freePlanFeatures.map((f) => (
                  <div className='flex items-center gap-2.5 text-sm' key={f}>
                    <Check className='size-3.5 shrink-0 text-primary' />
                    {f}
                  </div>
                ))}
              </div>
              <div className='mt-auto'>
                <Link
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'w-full',
                  })}
                  href='/auth/sign-up'
                >
                  Get started
                </Link>
              </div>
            </div>
            <div className='flex flex-col bg-card p-8'>
              <div className='mb-1 flex items-center gap-2'>
                <span className='font-semibold text-lg'>Pro</span>
                <span className='rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs'>
                  Recommended
                </span>
              </div>
              <div className='mb-4 flex items-baseline gap-1'>
                <span className='font-bold text-3xl tracking-tight'>$3</span>
                <span className='text-muted-foreground text-sm'>/ month</span>
              </div>
              <p className='mb-6 text-muted-foreground text-sm'>
                For freelancers and agencies that need room to grow.
              </p>
              <div className='mb-8 space-y-3'>
                {proPlanFeatures.map((f) => (
                  <div className='flex items-center gap-2.5 text-sm' key={f}>
                    <Check className='size-3.5 shrink-0 text-primary' />
                    {f}
                  </div>
                ))}
              </div>
              <div className='mt-auto'>
                <Link
                  className={buttonVariants({
                    size: 'lg',
                    className: 'w-full',
                  })}
                  href='/auth/sign-up'
                >
                  Start with Pro
                </Link>
              </div>
            </div>
          </div>
          <p className='mt-6 text-center text-muted-foreground text-sm'>
            No credit card required. No feature gates on core functionality.
          </p>
        </div>
      </section>

      <section className='mx-auto max-w-2xl px-6 py-24 text-center'>
        <h2 className='font-bold text-3xl tracking-tight'>
          Stop juggling tools.
          <br />
          Start running your business.
        </h2>
        <p className='mt-4 text-lg text-muted-foreground'>
          Saturn is free to get started. Set up your first project in under two
          minutes.
        </p>
        <div className='mt-8'>
          <Link className={buttonVariants({ size: 'lg' })} href='/auth/sign-up'>
            Get started for free
            <ArrowRight className='size-4' />
          </Link>
        </div>
      </section>

      <footer className='border-border border-t bg-secondary/40'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-6 py-6'>
          <div className='flex items-center gap-2'>
            <SaturnLogo className='size-4 text-muted-foreground' />
            <span className='text-muted-foreground text-sm'>Saturn</span>
          </div>
          <p className='text-muted-foreground text-xs'>
            &copy; {new Date().getFullYear()} Saturn
          </p>
        </div>
      </footer>
    </div>
  )
}
