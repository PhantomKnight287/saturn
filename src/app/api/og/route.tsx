import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { SaturnLogoLight } from '@/components/icons/saturn-logo'
import { baseUrl } from '@/lib/metadata'

export const runtime = 'edge'

const size = { width: 1200, height: 630 }

const subtitles: Record<string, string> = {
  Invoices: 'Create, send, and track invoices',
  Clients: 'Manage client relationships and access',
  Milestones: 'Track project milestones and deliverables',
  Requirements: 'Write, review, and sign off on requirements',
  Timesheets: 'Log hours and track team productivity',
  Expenses: 'Track and approve project expenses',
  Team: 'Manage your team members and roles',
  Settings: 'Configure your project and organization',
  Overview: 'Your project at a glance',
  Projects: 'Manage projects, requirements, and invoices',
  Proposals: 'Draft, send, and get proposals signed',
  Time: 'Track time against the right project',
}

const moduleRail = [
  'Projects',
  'Clients',
  'Proposals',
  'Requirements',
  'Timesheets',
  'Expenses',
  'Invoices',
  'Milestones',
]

async function loadFonts() {
  const [bold, regular] = await Promise.all([
    fetch(
      new URL(
        'https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-600-normal.woff'
      )
    ).then((r) => r.arrayBuffer()),
    fetch(
      new URL(
        'https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-400-normal.woff'
      )
    ).then((r) => r.arrayBuffer()),
  ])
  return { bold, regular }
}

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page')
  const subtitleParam = request.nextUrl.searchParams.get('subtitle')

  const isMarketing = !page || page === 'Saturn'
  const headlineLead = isMarketing ? 'Run your projects' : (page ?? 'Saturn')
  const headlineAccent = isMarketing ? 'from one tab.' : null
  const subtitle =
    subtitleParam ??
    (isMarketing
      ? 'Projects, proposals, time, timesheets, expenses, and invoices — one login instead of seven subscriptions.'
      : (page && subtitles[page]) || 'Run your projects from one tab.')

  const eyebrow = isMarketing
    ? 'For freelancers, agencies & solo builders'
    : `/ ${page}`

  const activeIndex = page
    ? moduleRail.findIndex((m) => m.toLowerCase() === page.toLowerCase())
    : -1
  const domain = baseUrl.host

  const { bold, regular } = await loadFonts()

  return new ImageResponse(
    <div
      style={{ background: '#0A0A0A', fontFamily: 'Geist' }}
      tw='flex w-full h-full relative'
    >
      {/* grid */}
      <div
        style={{
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
        tw='absolute flex'
      />

      {/* purple glow — anchored to the seam between the two columns */}
      <div
        style={{
          left: '52%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 760,
          height: 760,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,58,237,0.32) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)',
          filter: 'blur(20px)',
        }}
        tw='absolute flex'
      />

      {/* hairlines */}
      <div
        style={{
          left: 0,
          right: 0,
          top: 0,
          height: 1,
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.14), transparent)',
        }}
        tw='absolute flex'
      />
      <div
        style={{
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          background:
            'linear-gradient(to right, transparent, rgba(255,255,255,0.14), transparent)',
        }}
        tw='absolute flex'
      />

      {/* header rail */}
      <div
        style={{
          left: 64,
          right: 64,
          top: 44,
        }}
        tw='absolute flex items-center justify-between'
      >
        <div style={{ gap: 12 }} tw='flex items-center'>
          <SaturnLogoLight height={26} />
          <span
            style={{ letterSpacing: '-0.4px' }}
            tw='text-[20px] font-semibold text-white'
          >
            Saturn
          </span>
        </div>
        <div
          style={{
            letterSpacing: '2.4px',
            color: 'rgba(255,255,255,0.4)',
          }}
          tw='flex text-[12px] uppercase'
        >
          {domain}
        </div>
      </div>

      {/* left: text column */}
      <div
        style={{ padding: '0 64px', width: 720, gap: 28 }}
        tw='flex flex-col justify-center h-full relative'
      >
        <div
          style={{
            letterSpacing: '2.6px',
            color: 'rgba(255,255,255,0.5)',
          }}
          tw='flex items-center text-[13px] uppercase'
        >
          <span
            style={{
              width: 28,
              height: 1,
              background: 'rgba(255,255,255,0.3)',
              marginRight: 14,
            }}
            tw='flex'
          />
          {eyebrow}
        </div>

        <div
          style={{
            lineHeight: 0.96,
            letterSpacing: '-3.4px',
          }}
          tw='flex flex-col text-[80px] font-semibold text-white'
        >
          <span>{headlineLead}</span>
          {headlineAccent && (
            <span
              style={{
                color: 'rgba(255,255,255,0.42)',
                fontStyle: 'italic',
              }}
            >
              {headlineAccent}
            </span>
          )}
        </div>

        <p
          style={{
            letterSpacing: '-0.3px',
            color: 'rgba(255,255,255,0.55)',
            margin: 0,
            lineHeight: 1.4,
            maxWidth: 560,
          }}
          tw='text-[21px]'
        >
          {subtitle}
        </p>
      </div>

      {/* right: oversized module rail */}
      <div
        style={{
          right: 0,
          top: 0,
          bottom: 0,
          width: 420,
          paddingRight: 64,
          paddingTop: 110,
          paddingBottom: 90,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          gap: 6,
        }}
        tw='absolute flex flex-col justify-center items-end'
      >
        <div
          style={{
            letterSpacing: '2.4px',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 14,
          }}
          tw='flex text-[11px] uppercase'
        >
          / one workspace
        </div>
        {moduleRail.map((m, i) => {
          const active = i === activeIndex
          const distance = activeIndex >= 0 ? Math.abs(i - activeIndex) : 0
          return (
            <div
              key={m}
              style={{
                gap: 14,
                color: active
                  ? 'rgba(255,255,255,0.95)'
                  : 'rgba(255,255,255,1)',
                opacity:
                  activeIndex < 0
                    ? 0.32
                    : active
                      ? 1
                      : Math.max(0.18, 0.4 - distance * 0.05),
                letterSpacing: '-1.4px',
                lineHeight: 1.05,
              }}
              tw='flex items-center text-[40px] font-semibold'
            >
              {active && (
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(167,139,250,1)',
                    boxShadow: '0 0 18px rgba(167,139,250,0.8)',
                  }}
                  tw='flex'
                />
              )}
              <span style={active ? { fontStyle: 'italic' } : undefined}>
                {m}
              </span>
            </div>
          )
        })}
      </div>

      {/* fade behind module rail to blend into glow */}
      <div
        style={{
          right: 0,
          top: 0,
          bottom: 0,
          width: 420,
          background:
            'linear-gradient(to right, transparent, rgba(10,10,10,0.55))',
          pointerEvents: 'none',
        }}
        tw='absolute flex'
      />

      {/* footer eyebrow */}
      <div
        style={{
          left: 64,
          right: 64,
          bottom: 44,
        }}
        tw='absolute flex items-center'
      >
        <div
          style={{
            letterSpacing: '2.4px',
            color: 'rgba(255,255,255,0.4)',
          }}
          tw='flex text-[12px] uppercase'
        >
          {isMarketing ? 'Projects · Time · Invoices · Done.' : `/ ${page}`}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Geist',
          data: bold,
          style: 'normal' as const,
          weight: 600 as const,
        },
        {
          name: 'Geist',
          data: regular,
          style: 'normal' as const,
          weight: 400 as const,
        },
      ],
    }
  )
}
