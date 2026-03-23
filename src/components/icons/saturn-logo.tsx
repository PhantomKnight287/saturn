import type { SVGProps } from 'react'

export function SaturnLogoDark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='350 40 150 160' xmlns='http://www.w3.org/2000/svg' {...props}>
      <g transform='translate(-1.802,9.122)'>
        <g fill='#222222' transform='rotate(-60,443.362,113.348)'>
          <path d='m483.844,143.18h-90.613a52.399,52.711 0 0 0 45.306,26.23 52.399,52.711 0 0 0 45.307,-26.23z' />
          <path d='m516.809,122.669h-156.543a78.861,53.236 0 0 0 5.185,13.5h146.173a78.861,53.236 0 0 0 5.185,-13.5z' />
          <path d='M438.537,62.938A52.574,52.574 0 0 0 385.964,115.261H491.111A52.574,52.574 0 0 0 438.537,62.938Z' />
        </g>
      </g>
    </svg>
  )
}

export function SaturnLogoLight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox='350 40 150 160' xmlns='http://www.w3.org/2000/svg' {...props}>
      <g transform='translate(-1.802,9.122)'>
        <g fill='#ffffff' transform='rotate(-60,443.362,113.348)'>
          <path d='m483.844,143.18h-90.613a52.399,52.711 0 0 0 45.306,26.23 52.399,52.711 0 0 0 45.307,-26.23z' />
          <path d='m516.809,122.669h-156.543a78.861,53.236 0 0 0 5.185,13.5h146.173a78.861,53.236 0 0 0 5.185,-13.5z' />
          <path d='M438.537,62.938A52.574,52.574 0 0 0 385.964,115.261H491.111A52.574,52.574 0 0 0 438.537,62.938Z' />
        </g>
      </g>
    </svg>
  )
}

export function SaturnLogo({
  fill = 'currentColor',
  ...props
}: SVGProps<SVGSVGElement> & { fill?: string }) {
  return (
    <svg viewBox='350 40 150 160' xmlns='http://www.w3.org/2000/svg' {...props}>
      <g transform='translate(-1.802,9.122)'>
        <g fill={fill} transform='rotate(-60,443.362,113.348)'>
          <path d='m483.844,143.18h-90.613a52.399,52.711 0 0 0 45.306,26.23 52.399,52.711 0 0 0 45.307,-26.23z' />
          <path d='m516.809,122.669h-156.543a78.861,53.236 0 0 0 5.185,13.5h146.173a78.861,53.236 0 0 0 5.185,-13.5z' />
          <path d='M438.537,62.938A52.574,52.574 0 0 0 385.964,115.261H491.111A52.574,52.574 0 0 0 438.537,62.938Z' />
        </g>
      </g>
    </svg>
  )
}
