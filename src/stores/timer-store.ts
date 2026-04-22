import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TimerContext {
  orgSlug: string
  projectId: string
  projectName: string
  projectSlug: string
}

interface TimerState {
  accumulatedMs: number
  context: TimerContext | null
  pause: () => void
  resume: () => void
  start: (context: TimerContext) => void
  startedAt: number | null
  stop: () => void
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      startedAt: null,
      accumulatedMs: 0,
      context: null,
      start: (context) =>
        set({ startedAt: Date.now(), accumulatedMs: 0, context }),
      pause: () => {
        const { startedAt, accumulatedMs } = get()
        if (startedAt === null) {
          return
        }
        set({
          startedAt: null,
          accumulatedMs: accumulatedMs + (Date.now() - startedAt),
        })
      },
      resume: () => {
        if (get().startedAt !== null) {
          return
        }
        set({ startedAt: Date.now() })
      },
      stop: () => set({ startedAt: null, accumulatedMs: 0, context: null }),
    }),
    { name: 'saturn-timer' }
  )
)

export function getElapsedMs(
  startedAt: number | null,
  accumulatedMs: number,
  now: number
): number {
  return accumulatedMs + (startedAt === null ? 0 : now - startedAt)
}

export function elapsedMinutesFromMs(ms: number): number {
  return Math.max(1, Math.floor(ms / 60_000))
}

export function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
