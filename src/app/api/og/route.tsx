import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { SaturnLogoLight } from '@/components/icons/saturn-logo'

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
}

async function loadGeistFont() {
  const [bold, regular] = await Promise.all([
    fetch(
      new URL(
        'https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-700-normal.woff'
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
  const page = request.nextUrl.searchParams.get('page') || 'Saturn'
  const subtitle =
    subtitles[page] ?? 'The operating system for your freelance business'

  const { bold, regular } = await loadGeistFont()

  return new ImageResponse(
    <div
      style={{
        background:
          'linear-gradient(145deg, #0a0a0f 0%, #0d0b1a 40%, #120e24 100%)',
        overflow: 'hidden',
      }}
      tw='flex w-full h-full relative'
    >
      <div
        style={{
          right: -40,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.04,
        }}
        tw='absolute flex'
      >
        <SaturnLogoLight height={580} />
      </div>

      <div
        style={{
          width: 900,
          height: 900,
          borderRadius: '50%',
          border: '1px solid rgba(124,58,237,0.08)',
          right: -300,
          top: -140,
        }}
        tw='absolute flex'
      />
      <div
        style={{
          width: 700,
          height: 700,
          borderRadius: '50%',
          border: '1px solid rgba(124,58,237,0.05)',
          right: -200,
          top: -40,
        }}
        tw='absolute flex'
      />

      <div
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)',
          top: -100,
          right: 50,
        }}
        tw='absolute flex'
      />

      <div
        style={{
          left: 0,
          top: 0,
          bottom: 0,
          width: 5,
          background:
            'linear-gradient(to bottom, transparent, #7c3aed, #a78bfa, #7c3aed, transparent)',
        }}
        tw='absolute flex'
      />

      <div
        style={{ padding: '60px 72px' }}
        tw='flex flex-col justify-between h-full w-full relative'
      >
        <div style={{ gap: '14px' }} tw='flex items-center'>
          <SaturnLogoLight height={38} />
          <span
            style={{ letterSpacing: '-0.5px' }}
            tw='text-[28px] font-bold text-white'
          >
            Saturn
          </span>
        </div>

        <div style={{ gap: '20px', maxWidth: 800 }} tw='flex flex-col'>
          <h1
            style={{ lineHeight: 1, letterSpacing: '-3px' }}
            tw='text-[80px] font-bold text-white m-0'
          >
            {page}
          </h1>
          <p
            style={{ letterSpacing: '-0.3px' }}
            tw='text-[24px] text-white/40 m-0'
          >
            {subtitle}
          </p>
        </div>

        <div tw='flex items-center justify-between w-full'>
          <span
            style={{ letterSpacing: '3px', textTransform: 'uppercase' }}
            tw='text-[14px] text-white/20'
          >
            saturn.procrastinator.fyi
          </span>
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
          weight: 700 as const,
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
