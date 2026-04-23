'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface MediaItem {
  contentType: string
  createdAt: Date
  id: string
  name: string
}

interface MediaLibraryDialogProps {
  mediaItems: MediaItem[]
  onOpenChange: (open: boolean) => void
  /** Receives the media item ID */
  onSelect: (id: string) => void
  open: boolean
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  mediaItems,
  onSelect,
}: MediaLibraryDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = () => {
    if (!selectedId) {
      return
    }
    onSelect(selectedId)
    onOpenChange(false)
    setSelectedId(null)
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
          <DialogDescription>
            Choose from previously uploaded images.
          </DialogDescription>
        </DialogHeader>

        {mediaItems.length === 0 ? (
          <p className='py-8 text-center text-muted-foreground text-sm'>
            No images uploaded yet. Upload one to get started.
          </p>
        ) : (
          <div className='grid max-h-[360px] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4'>
            {mediaItems.map((item) => (
              <button
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-md border bg-muted transition-all hover:border-1 hover:border-primary',
                  selectedId === item.id && '!border-2 !border-primary'
                )}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type='button'
              >
                <Image
                  alt={item.name}
                  className='object-contain p-1'
                  fill
                  src={`/api/files/${item.id}`}
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button disabled={!selectedId} onClick={handleSelect}>
            Use Selected
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
