'use client'

import { Eraser, FolderOpen, Pen } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type ReactSignatureCanvas from 'react-signature-canvas'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { type MediaItem, MediaLibraryDialog } from './media-library-dialog'

const PAD_HEIGHT = 200

type SignatureSource = 'pad' | 'library'

export interface SignatureResult {
  dataUrl: string
  source: SignatureSource
}

export interface SignatureDialogProps {
  /** Extra content rendered below the pad / library picker */
  children?: React.ReactNode
  description?: string
  disabled?: boolean
  /** Previously uploaded signature images for reuse */
  mediaItems?: MediaItem[]
  onConfirm: (result: SignatureResult) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  /** Signature pad pen colour */
  penColor?: string
  title?: string
}

export function SignatureDialog({
  open,
  onOpenChange,
  onConfirm,
  mediaItems = [],
  title = 'Add Signature',
  description = 'Draw your signature below or pick one from the library.',
  penColor = 'black',
  disabled = false,
  children,
}: SignatureDialogProps) {
  const padRef = useRef<ReactSignatureCanvas | null>(null)

  const [source, setSource] = useState<SignatureSource>('pad')
  const [isEmpty, setIsEmpty] = useState(true)
  const [item, setItem] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [SignatureCanvasComp, setSignatureCanvasComp] = useState<
    typeof ReactSignatureCanvas | null
  >(null)

  useEffect(() => {
    if (!open || SignatureCanvasComp) {
      return
    }
    let cancelled = false
    import('react-signature-canvas').then((mod) => {
      if (!cancelled) {
        setSignatureCanvasComp(() => mod.default)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, SignatureCanvasComp])

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetState()
    }
    onOpenChange(next)
  }

  const resetState = () => {
    padRef.current?.clear()
    setIsEmpty(true)

    setSource('pad')
  }

  const handleClear = () => {
    padRef.current?.clear()
    setIsEmpty(true)
  }

  const handleEnd = () => {
    setIsEmpty(padRef.current?.isEmpty() ?? true)
  }

  const handleConfirm = () => {
    if (source === 'library') {
      onConfirm({ dataUrl: item!, source: 'library' })
      handleOpenChange(false)
      return
    }

    if (source === 'pad' && padRef.current && !padRef.current.isEmpty()) {
      const dataUrl = padRef.current.getTrimmedCanvas().toDataURL('image/png')
      onConfirm({ dataUrl, source })
      handleOpenChange(false)
    }
  }

  const handleLibrarySelect = (id: string) => {
    const mediaItem = mediaItems.find((m) => m.id === id)
    if (mediaItem) {
      setSource('library')
      setItem(mediaItem.id)
    }
    setLibraryOpen(false)
  }

  const switchToPad = () => {
    setSource('pad')
  }

  const hasMedia = mediaItems.length > 0
  const canConfirm = source === 'pad' ? !isEmpty : true

  return (
    <>
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {hasMedia ? description : 'Draw your signature below.'}
            </DialogDescription>
          </DialogHeader>

          {source === 'pad' ? (
            <div className='space-y-3'>
              <div className='relative overflow-hidden rounded-md border bg-white'>
                {SignatureCanvasComp ? (
                  <SignatureCanvasComp
                    canvasProps={{
                      className: 'w-full cursor-crosshair',
                      height: PAD_HEIGHT,
                      style: { width: '100%', height: PAD_HEIGHT },
                    }}
                    onEnd={handleEnd}
                    penColor={penColor}
                    ref={padRef}
                  />
                ) : (
                  <div
                    className='flex items-center justify-center text-muted-foreground text-sm'
                    style={{ height: PAD_HEIGHT }}
                  >
                    Loading…
                  </div>
                )}

                {!isEmpty && (
                  <Button
                    className='absolute top-2 right-2'
                    onClick={handleClear}
                    size='icon-xs'
                    type='button'
                    variant='outline'
                  >
                    <Eraser className='size-3' />
                  </Button>
                )}
              </div>
              <div>
                {hasMedia && (
                  <Button
                    onClick={() => setLibraryOpen(true)}
                    size='sm'
                    type='button'
                    variant='outline'
                  >
                    <FolderOpen className='size-3.5' />
                    Pick from library
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className='space-y-3'>
              <div
                className='flex items-center justify-center rounded-md border bg-white p-4'
                style={{ minHeight: PAD_HEIGHT }}
              >
                {item && (
                  <Image
                    alt='Selected signature'
                    className='max-h-[160px] object-contain'
                    height={160}
                    src={`/api/files/${item}`}
                    unoptimized
                    width={300}
                  />
                )}
              </div>

              <div className='flex justify-end'>
                <Button
                  onClick={switchToPad}
                  size='sm'
                  type='button'
                  variant='outline'
                >
                  <Pen className='size-3.5' />
                  Draw instead
                </Button>
              </div>
            </div>
          )}

          {children}

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              type='button'
              variant='outline'
            >
              Cancel
            </Button>
            <Button
              disabled={!canConfirm || disabled}
              onClick={handleConfirm}
              type='button'
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaLibraryDialog
        mediaItems={mediaItems}
        onOpenChange={setLibraryOpen}
        onSelect={handleLibrarySelect}
        open={libraryOpen}
      />
    </>
  )
}
