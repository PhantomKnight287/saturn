import { ImageResponse } from 'next/og'
import { SaturnLogoLight } from '@/components/icons/saturn-logo'

export const runtime = 'edge'
export const alt = 'Projects - Saturn'
export const size = { width: 1200, height: 600 }
export const contentType = 'image/png'

async function loadGeistFont() {
  const res = await fetch(
    new URL(
      'https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-700-normal.woff'
    )
  )
  return res.arrayBuffer()
}

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ org: string }>
}) {
  const { org } = await params
  const geistBold = await loadGeistFont()

  return new ImageResponse(
    <div tw='flex flex-col w-full h-full bg-[#09090b] relative overflow-hidden'>
      <div tw='absolute top-0 left-0 right-0 h-1 flex bg-[#7c3aed]' />

      <div
        style={{ padding: '56px 64px' }}
        tw='flex flex-col justify-between h-full relative'
      >
        <div style={{ gap: '16px' }} tw='flex items-center'>
          <SaturnLogoLight height={40} width={40} />
          <div style={{ gap: '12px' }} tw='flex items-center'>
            <span
              style={{ letterSpacing: '-0.5px' }}
              tw='text-[26px] font-bold text-white'
            >
              Saturn
            </span>
            <span tw='text-[26px] text-white/25'>/</span>
            <span tw='text-[26px] font-bold text-white/50'>{org}</span>
          </div>
        </div>

        <div style={{ gap: '20px' }} tw='flex flex-col'>
          <h1
            style={{ lineHeight: 1, letterSpacing: '-3px' }}
            tw='text-[80px] font-bold text-white m-0'
          >
            Projects
          </h1>
          <p
            style={{ letterSpacing: '-0.3px' }}
            tw='text-[26px] font-bold text-white/40 m-0'
          >
            Manage projects, requirements, and invoices
          </p>
        </div>

        <div tw='flex items-center justify-between' />
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Geist',
          data: geistBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}
