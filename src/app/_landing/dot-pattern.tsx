export function DotPattern({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage:
          'radial-gradient(circle, oklch(0.556 0 0 / 0.25) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  )
}
