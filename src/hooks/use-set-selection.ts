'use client'

import { useCallback, useState } from 'react'

export function useSetSelection<T>(
  getId: (item: T) => string = (x) => x as unknown as string
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(
    (items: T[]) => {
      setSelectedIds((prev) => {
        const allSelected =
          items.length > 0 && items.every((i) => prev.has(getId(i)))
        if (allSelected) {
          const next = new Set(prev)
          for (const i of items) {
            next.delete(getId(i))
          }
          return next
        }
        const next = new Set(prev)
        for (const i of items) {
          next.add(getId(i))
        }
        return next
      })
    },
    [getId]
  )

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  return { selectedIds, setSelectedIds, toggle, toggleAll, clear }
}
