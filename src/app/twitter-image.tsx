import { ImageResponse } from 'next/og'
import { SaturnLogoLight } from '@/components/icons/saturn-logo'

export const runtime = 'edge'
export const alt = 'Saturn - Freelance Project Management'
export const size = { width: 1200, height: 600 }
export const contentType = 'image/png'

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

export default async function TwitterImage() {
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
          right: -20,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.04,
        }}
        tw='absolute flex'
      >
        <SaturnLogoLight height={540} />
      </div>
      <div
        style={{
          width: 800,
          height: 800,
          borderRadius: '50%',
          border: '1px solid rgba(124,58,237,0.08)',
          right: -250,
          top: -100,
        }}
        tw='absolute flex'
      />
      <div
        style={{
          width: 600,
          height: 600,
          borderRadius: '50%',
          border: '1px solid rgba(124,58,237,0.05)',
          right: -150,
          top: 0,
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
          width: 400,
          height: 400,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(251,146,60,0.06) 0%, transparent 70%)',
          bottom: -120,
          left: 40,
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
        style={{ padding: '56px 72px' }}
        tw='flex flex-col justify-between h-full w-full relative'
      >
        <div tw='flex items-center justify-between w-full'>
          <div style={{ gap: '14px' }} tw='flex items-center'>
            <SaturnLogoLight height={36} />
            <span
              style={{ letterSpacing: '-0.5px' }}
              tw='text-[26px] font-bold text-white'
            >
              Saturn
            </span>
          </div>
          <span
            style={{ letterSpacing: '3px', textTransform: 'uppercase' }}
            tw='text-[14px] text-white/30'
          >
            For freelancers & agencies
          </span>
        </div>
        <div style={{ gap: '24px', maxWidth: 780 }} tw='flex flex-col'>
          <div style={{ gap: '0px' }} tw='flex flex-col'>
            <span
              style={{ lineHeight: 0.95, letterSpacing: '-4px' }}
              tw='text-[80px] font-bold text-white'
            >
              Ship projects.
            </span>
            <span
              style={{
                lineHeight: 0.95,
                letterSpacing: '-4px',
                color: '#a78bfa',
              }}
              tw='text-[80px] font-bold'
            >
              Get paid.
            </span>
          </div>
          <p
            style={{ letterSpacing: '-0.3px' }}
            tw='text-[20px] text-white/40 m-0'
          >
            Track requirements, manage teams, log hours, and invoice clients —
            from one dashboard.
          </p>
        </div>
        <div tw='flex' />
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
