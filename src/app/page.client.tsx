/** biome-ignore-all lint/correctness/useUniqueElementIds: anchor ids for in-page nav */

'use client'
import { ArrowDown, ArrowRight, Check, Minus } from 'lucide-react'
import Link from 'next/link'
import { GitHub } from '@/components/icons/github'
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
import { MockAppUI } from './_landing/mock-app-ui'
import { MockExpenseCard } from './_landing/mock-expense-card'
import { MockInvoiceCard } from './_landing/mock-invoice-card'
import { MockProposalCard } from './_landing/mock-proposal-card'
import { MockRequirementCard } from './_landing/mock-requirement-card'
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

      <section className='relative overflow-hidden border-border/60 border-b'>
        <div className='relative mx-auto max-w-6xl px-6 pt-24 pb-10 sm:pt-32'>
          <div className='max-w-3xl'>
            <div className='mb-6 inline-flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              <span className='h-px w-6 bg-muted-foreground/40' />
              Saturn — for freelancers, agencies & solo builders
            </div>
            <h1 className='font-semibold text-5xl text-foreground leading-[0.98] tracking-[-0.04em] sm:text-6xl'>
              Run your projects
              <br />
              <span className='text-muted-foreground/80 italic'>
                from one tab.
              </span>
            </h1>
            <p className='mt-8 max-w-xl text-muted-foreground text-xl leading-relaxed'>
              Projects, proposals, time, timesheets, expenses, and invoices —
              one login instead of seven subscriptions.
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

      <section className='border-border/60 border-b'>
        <div className='mx-auto max-w-6xl px-6 py-20 sm:py-24'>
          <div className='mb-12 max-w-2xl'>
            <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
              / everything inside
            </div>
            <h2 className='mt-3 font-semibold text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
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
                <m.icon className='size-5 text-primary' strokeWidth={1.75} />
                <div className='mt-1 font-medium text-base text-foreground tracking-tight'>
                  {m.name}
                </div>
                <p className='text-base text-muted-foreground leading-relaxed'>
                  {m.blurb}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className='mx-auto max-w-6xl px-6 pt-24 pb-24 sm:pt-32'
        id='features'
      >
        <div className='mb-20 max-w-3xl'>
          <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
            / a closer look
          </div>
          <h2 className='mt-3 font-semibold text-4xl text-foreground leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
            A tab each for the work
            <br />
            <span className='text-muted-foreground/70 italic'>
              you used to do in seven.
            </span>
          </h2>
        </div>

        <div className='flex flex-col'>
          <FeatureRow
            description='Draft proposals inside Saturn, send them to clients, and collect signatures without a separate DocuSign tab. Status updates land in the project, not your inbox.'
            label='01 — Proposals'
            title='Write it. Send it.'
            titleAccent='Get it signed.'
          >
            <MockProposalCard />
          </FeatureRow>

          <FeatureRow
            description='Time tracked inside the platform, auto-attached to the right project. No separate Toggl tab to forget about.'
            label='02 — Time tracking'
            reverse
            title='Press record.'
            titleAccent='Stop when done.'
          >
            <MockTimer />
          </FeatureRow>

          <FeatureRow
            description='Lock scope with clients. Capture feedback inline, track change requests, and keep the brief in one place — not buried in email threads.'
            label='03 — Requirements'
            title='Scope locked.'
            titleAccent='Changes tracked.'
          >
            <MockRequirementCard />
          </FeatureRow>

          <FeatureRow
            description='Log weekly or let the timer do it. Export reports when clients ask. Hours flow into invoices in one click.'
            label='04 — Timesheets'
            reverse
            title='Hours that become'
            titleAccent='invoice lines.'
          >
            <MockTimesheetCard />
          </FeatureRow>

          <FeatureRow
            description='Log what you spent, tag it billable, and attach it to the next invoice. Receipts, software, lunches — all in one place.'
            label='05 — Expenses'
            title='Expenses that'
            titleAccent='bill themselves.'
          >
            <MockExpenseCard />
          </FeatureRow>

          <FeatureRow
            description='Lines pull from timesheets and expenses. Export PDF. Track paid status. The last step that finally feels like the first.'
            label='06 — Invoices'
            reverse
            title='One click from'
            titleAccent='hours to paid.'
          >
            <MockInvoiceCard />
          </FeatureRow>
        </div>
      </section>

      <section className='border-border/60 border-t'>
        <div className='mx-auto max-w-6xl px-6 py-24 sm:py-28'>
          <div className='grid grid-cols-1 items-center gap-12 lg:grid-cols-2'>
            <div className='max-w-xl'>
              <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
                / clients optional
              </div>
              <h2 className='mt-3 font-semibold text-4xl leading-[1.02] tracking-[-0.03em] sm:text-5xl'>
                Working solo?{' '}
                <span className='text-muted-foreground/70 italic'>
                  Toggle clients off.
                </span>
              </h2>
              <p className='mt-6 text-muted-foreground text-xl leading-relaxed'>
                Saturn works just as well for personal projects as it does for
                client work. Decide per workspace which modules involve clients
                — or turn them off entirely and keep the projects, time
                tracking, and invoices for yourself.
              </p>
            </div>
            <div className='rounded-2xl border border-border/60 bg-card p-6 sm:p-8'>
              <div className='mb-4 flex items-center justify-between font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
                <span>Client involvement</span>
                <span>Per project/workspace</span>
              </div>
              <div className='divide-y divide-border/60'>
                {[
                  ['Proposals', true],
                  ['Requirements', true],
                  ['Milestones', false],
                  ['Timesheets', true],
                  ['Expenses', false],
                  ['Invoices', true],
                ].map(([label, on]) => (
                  <div
                    className='flex items-center justify-between py-3'
                    key={label as string}
                  >
                    <span className='font-medium text-base text-foreground'>
                      {label}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        on
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted/60 text-muted-foreground'
                      }`}
                    >
                      {on ? 'on' : 'off'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

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
                className='flex flex-col rounded-2xl border border-border/60 bg-card p-6'
                key={s.step}
              >
                <div className='flex items-center gap-3'>
                  <div className='flex size-9 items-center justify-center rounded-full border border-border/60 bg-background'>
                    <s.icon
                      className='size-4 text-primary'
                      strokeWidth={1.75}
                    />
                  </div>
                  <span className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
                    Step {s.step}
                  </span>
                </div>
                <h3 className='mt-5 font-semibold text-2xl text-foreground tracking-[-0.02em]'>
                  {s.title}
                </h3>
                <p className='mt-2 text-base text-muted-foreground leading-relaxed'>
                  {s.body}
                </p>
                <ul className='mt-5 space-y-2'>
                  {s.highlights.map((h) => (
                    <li
                      className='flex items-center gap-2 text-foreground/80 text-sm'
                      key={h}
                    >
                      <Check className='size-3.5 shrink-0 text-primary' />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              className={`grid grid-cols-[1.2fr_1fr_1fr] items-center px-5 py-4 text-base ${
                i === comparison.length - 1 ? '' : 'border-border/60 border-b'
              }`}
              key={row.need}
            >
              <span className='font-medium text-foreground'>{row.need}</span>
              <span className='text-muted-foreground'>{row.stack}</span>
              <span className='flex items-center gap-1.5 text-foreground'>
                <Check className='size-4 text-primary' />
                {row.saturn}
              </span>
            </div>
          ))}
        </div>
      </section>

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
            <p className='mt-4 text-muted-foreground text-xl'>
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
              suffix='/ month + taxes'
            />
          </div>
          <p className='mt-6 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
            No credit card required
          </p>
        </div>
      </section>

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
              <summary className='flex cursor-pointer items-center justify-between gap-6 font-medium text-foreground text-lg tracking-tight'>
                {item.q}
                <span className='font-mono text-muted-foreground text-sm transition-transform group-open:rotate-45'>
                  +
                </span>
              </summary>
              <p className='mt-3 text-base text-muted-foreground leading-relaxed'>
                {item.a}
              </p>
            </details>
          ))}
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
              href='/changelogs'
            >
              Changelogs
            </Link>
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
              <GitHub className='size-3.5' />
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

function FeatureRow({
  label,
  title,
  titleAccent,
  description,
  reverse = false,
  children,
}: {
  label: string
  title: string
  titleAccent: string
  description: string
  reverse?: boolean
  children: React.ReactNode
}) {
  return (
    <div className='grid grid-cols-1 items-center gap-10 border-border/60 border-t py-16 first:border-t-0 first:pt-0 sm:py-20 lg:grid-cols-2 lg:gap-16'>
      <div className={reverse ? 'lg:order-2' : ''}>
        <div className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.18em]'>
          / {label}
        </div>
        <h3 className='mt-4 font-semibold text-3xl text-foreground leading-[1.05] tracking-[-0.03em] sm:text-4xl'>
          {title}{' '}
          <span className='text-muted-foreground/70 italic'>{titleAccent}</span>
        </h3>
        <p className='mt-5 text-base text-muted-foreground leading-relaxed sm:text-lg'>
          {description}
        </p>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>
        <div className='relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 sm:p-8'>
          <div
            aria-hidden
            className='pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-primary/5 blur-3xl'
          />
          {children}
        </div>
      </div>
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
        <span className='font-medium text-lg tracking-tight'>{name}</span>
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
        <span className='text-base text-muted-foreground'>{suffix}</span>
      </div>
      <p className='mt-3 text-base text-muted-foreground'>{description}</p>
      <div className='mt-6 space-y-2.5 border-border/60 border-t pt-6'>
        {features.map((f) => (
          <div
            className='flex items-center gap-2.5 text-base text-foreground/80'
            key={f}
          >
            <Check className='size-4 shrink-0 text-primary' />
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
