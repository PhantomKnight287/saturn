import { useMemo } from 'react'

function seededRandom(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: Needed for that cool effect
    h = seed.charCodeAt(i) + ((h << 5) - h)
  }
  let s = Math.abs(h)
  return () => {
    s = (s * 16_807 + 0) % 2_147_483_647
    return s / 2_147_483_647
  }
}

const W = 300
const H = 80

export default function ProjectBanner({ seed }: { seed: string }) {
  const { points, triangles, hue } = useMemo(() => {
    const rand = seededRandom(seed)
    const hue = Math.floor(rand() * 360)
    const cols = 8
    const rows = 4
    const spacingX = W / (cols - 1)
    const spacingY = H / (rows - 1)

    const points: { x: number; y: number }[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        points.push({
          x:
            c * spacingX +
            (c > 0 && c < cols - 1 ? (rand() - 0.5) * spacingX * 0.6 : 0),
          y:
            r * spacingY +
            (r > 0 && r < rows - 1 ? (rand() - 0.5) * spacingY * 0.6 : 0),
        })
      }
    }

    const triangles: {
      p1: number
      p2: number
      p3: number
      opacity: number
    }[] = []
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = r * cols + c
        const tr = tl + 1
        const bl = (r + 1) * cols + c
        const br = bl + 1
        triangles.push({
          p1: tl,
          p2: tr,
          p3: bl,
          opacity: 0.05 + rand() * 0.15,
        })
        triangles.push({
          p1: tr,
          p2: br,
          p3: bl,
          opacity: 0.05 + rand() * 0.15,
        })
      }
    }

    return { points, triangles, hue }
  }, [seed])

  return (
    <svg
      className='h-40 w-full rounded-t-xl'
      preserveAspectRatio='xMidYMid slice'
      viewBox={`0 0 ${W} ${H}`}
    >
      <rect className='fill-muted/50' height={H} width={W} />
      {triangles.map((tri, i) => {
        const a = points[tri.p1]
        const b = points[tri.p2]
        const c = points[tri.p3]
        return (
          <polygon
            fill={`hsl(${hue + (i % 2 === 0 ? 0 : 15)}, 16%, 52%)`}
            key={i}
            opacity={tri.opacity}
            points={`${a!.x},${a!.y} ${b!.x},${b!.y} ${c!.x},${c!.y}`}
            stroke={`hsl(${hue}, 14%, 48%)`}
            strokeWidth={0.3}
          />
        )
      })}
    </svg>
  )
}
