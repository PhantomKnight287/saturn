/** biome-ignore-all lint/correctness/useUniqueElementIds: anchor ids for in-page nav */

'use client'
import { ArrowDown, ArrowRight, Check, Github, Minus } from 'lucide-react'
import Link from 'next/link'

import { SaturnLogo } from '@/components/icons/saturn-logo'
import { buttonVariants } from '@/components/ui/button'
import {
  comparison,
  faq,
  freePlanFeatures,
  howItWorks,
  modules,
  proPlanFeatures,
} from './_landing/data'
import { LandingNav } from './_landing/landing-nav'
import { MockAnalytics } from './_landing/mock-analytics'
import { MockAppUI } from './_landing/mock-app-ui'
import { MockExpenseCard } from './_landing/mock-expense-card'
import { MockInvoiceCard } from './_landing/mock-invoice-card'
import { MockProposalCard } from './_landing/mock-proposal-card'
import { MockTimer } from './_landing/mock-timer'
import { MockTimesheetCard } from './_landing/mock-timesheet-card'

export default function LandingPageClient({
  githubStars,
}: {
  githubStars: number | null
}) {
  return (
    <div className='min-h-svh w-full bg-background text-foreground'>
      <LandingNav githubStars={githubStars} />

      {/* HERO */}
      <section className='relative overflow-hidden border-border/60 border-b'>
        <div className='relative mx-auto max-w-6xl px-6 pt-24 pb-10 sm:pt-32'>
          <div className='max-w-3xl'>
            <div className='mb-6 inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              <span className='h-px w-6 bg-muted-foreground/40' />
              Saturn — for freelancers & small agencies
            </div>
            <h1 className='font-semibold text-5xl text-foreground leading-[0.98] tracking-[-0.04em] sm:text-6xl'>
              Run your freelance business
              <br />
              <span className='text-muted-foreground/80 italic'>
                from one tab.
              </span>
            </h1>
            <p className='mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed'>
              Projects, clients, proposals, time tracking, timesheets, expenses,
              and invoices — one login instead of seven subscriptions.
            </p>
            <div className='mt-10 flex items-center gap-3'>
              <Link
                className={buttonVariants({ size: 'lg' })}
                href='/auth/sign-up'
              >
                Start for free
                <ArrowRight className='size-4' />
              </Link>
              <Link
                className='inline-flex items-center gap-1.5 text-foreground/80 text-sm hover:text-foreground'
                href='#features'
              >
                Features
                <ArrowDown className='size-3.5' />
              </Link>
            </div>

            <div className='mt-12 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
              {[
                'Projects',
                'Clients',
                'Team',
                'Proposals',
                'Time',
                'Timesheets',
                'Expenses',
                'Invoices',
              ].map((chip, i) => (
                <span className='flex items-center gap-2' key={chip}>
                  {i > 0 && (
                    <span className='h-1 w-1 rounded-full bg-muted-foreground/40' />
                  )}
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* product shot */}
        <div className='relative mx-auto max-w-6xl px-6 pb-0'>
          <div className='relative'>
            <div
              aria-hidden
              className='pointer-events-none absolute top-10 left-1/2 -z-10 h-64 w-[90%] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl'
            />
            <MockAppUI />
            <div
              aria-hidden
              className='pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background'
            />
          </div>
        </div>
      </section>

      {/* MODULES OVERVIEW */}
      <section className='border-border/60 border-b'>
        <div className='mx-auto max-w-6xl px-6 py-20 sm:py-24'>
          <div className='mb-12 max-w-2xl'>
            <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              / everything inside
            </div>
            <h2 className='mt-3 font-semibold text-3xl leading-[1.05] tracking-[-0.03em] sm:text-4xl'>
              Eight modules.{' '}
              <span className='text-muted-foreground/70'>One workspace.</span>
            </h2>
          </div>
          <div className='grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4'>
            {modules.map((m) => (
              <div
                className='flex flex-col gap-2 border-border/60 border-t pt-5'
                key={m.name}
              >
                <m.icon className='size-4 text-primary' strokeWidth={1.75} />
                <div className='mt-1 font-medium text-foreground text-sm tracking-tight'>
                  {m.name}
                </div>
                <p className='text-muted-foreground text-sm leading-relaxed'>
                  {m.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO */}
      <section
        className='mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-32'
        id='features'
      >
        <div className='mb-14 flex items-end justify-between gap-6'>
          <div>
            <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              / a closer look
            </div>
            <h2 className='mt-3 max-w-2xl font-semibold text-4xl text-foreground leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
              A tab each for the work
              <br />
              <span className='text-muted-foreground/70'>
                you used to do in seven.
              </span>
            </h2>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-6'>
          {/* Proposals — large */}
          <BentoCard
            className='md:col-span-4 md:row-span-2'
            description='Draft proposals inside Saturn, send them to clients, and collect signatures without a separate DocuSign tab.'
            title='Write it. Send it. Get it signed.'
          >
            <div className='relative mt-6 h-[250px] overflow-hidden rounded-lg border border-border/60 bg-card/60 p-6'>
              <MockProposalCard />
            </div>
          </BentoCard>

          {/* Timer */}
          <BentoCard
            className='md:col-span-2'
            description='Time tracked inside the platform, auto-attached to the right project.'
            title='Press record.'
          >
            <MockTimer />
          </BentoCard>

          {/* Analytics */}
          <BentoCard
            className='md:col-span-2'
            description='Revenue, hours, and overdue invoices the moment you log in.'
            title='Know the month at a glance.'
          >
            <MockAnalytics />
          </BentoCard>

          {/* Timesheet */}
          <BentoCard
            className='md:col-span-2'
            description='Log weekly or let the timer do it. Export reports when clients ask.'
            title='Hours that become invoice lines.'
          >
            <MockTimesheetCard />
          </BentoCard>

          {/* Expenses */}
          <BentoCard
            className='md:col-span-2'
            description='Log what you spent, tag it billable, and attach it to the next invoice.'
            title='Expenses that bill themselves.'
          >
            <MockExpenseCard />
          </BentoCard>

          {/* Invoice */}
          <BentoCard
            className='md:col-span-2'
            description='Lines pull from timesheets and expenses. Export PDF. Track paid status.'
            title='One click from hours to paid.'
          >
            <MockInvoiceCard />
          </BentoCard>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className='border-border/60 border-y bg-secondary/20'>
        <div className='mx-auto max-w-6xl px-6 py-24 sm:py-28'>
          <div className='mb-14 max-w-2xl'>
            <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              / how it works
            </div>
            <h2 className='mt-3 font-semibold text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
              Three steps,{' '}
              <span className='text-muted-foreground/70 italic'>
                start to paid.
              </span>
            </h2>
          </div>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            {howItWorks.map((s) => (
              <div
                className='flex flex-col rounded-2xl border border-border/60 bg-card p-7'
                key={s.step}
              >
                <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
                  {s.step}
                </div>
                <h3 className='mt-6 font-medium text-foreground text-xl tracking-[-0.02em]'>
                  {s.title}
                </h3>
                <p className='mt-2 text-muted-foreground text-sm leading-relaxed'>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className='mx-auto max-w-5xl px-6 py-24 sm:py-28'>
        <div className='mb-12 max-w-2xl'>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
            / vs. the stack
          </div>
          <h2 className='mt-3 font-semibold text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
            Seven tools,{' '}
            <span className='text-muted-foreground/70 italic'>
              or just this one.
            </span>
          </h2>
        </div>
        <div className='overflow-hidden rounded-2xl border border-border/60'>
          <div className='grid grid-cols-[1.2fr_1fr_1fr] items-center bg-muted/30 px-5 py-3 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
            <span>What you need</span>
            <span className='flex items-center gap-1.5'>
              <Minus className='size-3' />
              Stitching it together
            </span>
            <span className='flex items-center gap-1.5 text-primary'>
              <SaturnLogo className='size-3' />
              Saturn
            </span>
          </div>
          {comparison.map((row, i) => (
            <div
              className={`grid grid-cols-[1.2fr_1fr_1fr] items-center px-5 py-4 text-sm ${
                i !== comparison.length - 1 ? 'border-border/60 border-b' : ''
              }`}
              key={row.need}
            >
              <span className='font-medium text-foreground'>{row.need}</span>
              <span className='text-muted-foreground'>{row.stack}</span>
              <span className='flex items-center gap-1.5 text-foreground'>
                <Check className='size-3.5 text-primary' />
                {row.saturn}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        className='relative border-border/60 border-y bg-secondary/20'
        id='pricing'
      >
        <div className='mx-auto max-w-5xl px-6 py-24 sm:py-28'>
          <div className='mb-14 max-w-xl'>
            <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              / pricing
            </div>
            <h2 className='mt-3 font-semibold text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
              Three dollars, no seats.
            </h2>
            <p className='mt-4 text-lg text-muted-foreground'>
              Every feature works on Free. Pro removes the limits.
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <PricingCard
              cta='Get started'
              ctaVariant='outline'
              description='Enough to run a small practice.'
              features={freePlanFeatures}
              name='Free'
              price='$0'
              suffix='forever'
            />
            <PricingCard
              badge='Recommended'
              cta='Start with Pro'
              description='For when projects and clients start stacking up.'
              features={proPlanFeatures}
              name='Pro'
              price='$3'
              suffix='/ month'
            />
          </div>
          <p className='mt-6 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
            No credit card required
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className='mx-auto max-w-3xl px-6 py-24 sm:py-28' id='faq'>
        <div className='mb-12'>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
            / faq
          </div>
          <h2 className='mt-3 font-semibold text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
            Questions,{' '}
            <span className='text-muted-foreground/70 italic'>answered.</span>
          </h2>
        </div>
        <div className='divide-y divide-border/60 border-border/60 border-y'>
          {faq.map((item) => (
            <details className='group py-5' key={item.q}>
              <summary className='flex cursor-pointer items-center justify-between gap-6 font-medium text-base text-foreground tracking-tight'>
                {item.q}
                <span className='font-mono text-muted-foreground text-xs transition-transform group-open:rotate-45'>
                  +
                </span>
              </summary>
              <p className='mt-3 text-muted-foreground text-sm leading-relaxed'>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className='mx-auto max-w-3xl px-6 py-28 text-center sm:py-36'>
        <h2 className='font-semibold text-4xl leading-[1.02] tracking-[-0.04em] sm:text-6xl'>
          Two minutes to
          <br />
          <span className='text-muted-foreground/80 italic'>
            your first project.
          </span>
        </h2>
        <div className='mt-10 flex items-center justify-center gap-3'>
          <Link className={buttonVariants({ size: 'lg' })} href='/auth/sign-up'>
            Start for free
            <ArrowRight className='size-4' />
          </Link>
        </div>
      </section>

      <footer className='border-border/60 border-t'>
        <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6'>
          <div className='flex items-center gap-2'>
            <SaturnLogo className='size-4 text-muted-foreground' />
            <span className='text-muted-foreground text-sm'>Saturn</span>
          </div>
          <div className='flex items-center gap-5'>
            <Link
              className='text-muted-foreground text-sm transition-colors hover:text-foreground'
              href='/terms'
            >
              Terms
            </Link>
            <Link
              className='text-muted-foreground text-sm transition-colors hover:text-foreground'
              href='/privacy'
            >
              Privacy
            </Link>
            <a
              className='inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground'
              href='https://github.com/phantomknight287/saturn'
              rel='noreferrer noopener'
              target='_blank'
            >
              <Github className='size-3.5' />
              GitHub
            </a>
            <p className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              &copy; {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function BentoCard({
  className,
  title,
  description,
  children,
}: {
  className?: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-colors hover:border-border ${className ?? ''}`}
    >
      <h3 className='font-medium text-foreground text-xl tracking-[-0.02em]'>
        {title}
      </h3>
      <p className='mt-2 max-w-md text-muted-foreground text-sm leading-relaxed'>
        {description}
      </p>
      <div className='mt-6 flex-1'>{children}</div>
    </div>
  )
}

function PricingCard({
  name,
  price,
  suffix,
  description,
  features,
  cta,
  ctaVariant = 'default',
  badge,
}: {
  name: string
  price: string
  suffix: string
  description: string
  features: readonly string[]
  cta: string
  ctaVariant?: 'default' | 'outline'
  badge?: string
}) {
  return (
    <div className='flex flex-col rounded-2xl border border-border/60 bg-card p-7'>
      <div className='flex items-center gap-2'>
        <span className='font-medium text-base tracking-tight'>{name}</span>
        {badge && (
          <span className='rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary uppercase tracking-wider'>
            {badge}
          </span>
        )}
      </div>
      <div className='mt-4 flex items-baseline gap-1.5'>
        <span className='font-semibold text-5xl tracking-[-0.04em]'>
          {price}
        </span>
        <span className='text-muted-foreground text-sm'>{suffix}</span>
      </div>
      <p className='mt-3 text-muted-foreground text-sm'>{description}</p>
      <div className='mt-6 space-y-2.5 border-border/60 border-t pt-6'>
        {features.map((f) => (
          <div
            className='flex items-center gap-2.5 text-foreground/80 text-sm'
            key={f}
          >
            <Check className='size-3.5 shrink-0 text-primary' />
            {f}
          </div>
        ))}
      </div>
      <div className='mt-8'>
        <Link
          className={buttonVariants({
            variant: ctaVariant,
            className: 'w-full',
          })}
          href='/auth/sign-up'
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}
