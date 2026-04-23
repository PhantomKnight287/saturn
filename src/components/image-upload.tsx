'use client'

import { FolderOpen, ImagePlus, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadFile } from '@/lib/upload'
import { type MediaItem, MediaLibraryDialog } from './media-library-dialog'

export interface ImageUploadProps {
  disabled?: boolean
  label: string
  /** Previously uploaded media for reuse */
  mediaItems?: MediaItem[]
  /** Receives the media item ID (not a URL) */
  onChange: (id: string | null) => void
  /** Called after a successful upload with the new media ID and URL */
  onUploadComplete?: (item: { id: string }) => void
  /** Max width/height for the preview */
  previewSize?: number
  projectId: string
  /** Media item ID (not a URL) */
  value: string | null
}

export default function ImageUpload({
  value,
  onChange,
  projectId,
  label,
  disabled,
  previewSize = 120,
  mediaItems = [],
  onUploadComplete,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)

  const displayId = value ?? null

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.')
      return
    }

    setUploading(true)
    try {
      const { id } = await uploadFile(file, projectId)
      onUploadComplete?.({ id })
      onChange(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    e.target.value = ''
  }

  return (
    <div className='space-y-2'>
      <input
        accept='image/*'
        className='hidden'
        disabled={disabled || uploading}
        onChange={handleChange}
        ref={inputRef}
        type='file'
      />

      {displayId ? (
        <div
          className='group relative inline-block rounded-md border bg-white'
          style={{ maxWidth: previewSize, maxHeight: previewSize }}
        >
          <Image
            alt={label}
            className='rounded-md object-contain'
            height={previewSize}
            src={`/api/files/${displayId}`}
            style={{ maxWidth: previewSize, maxHeight: previewSize }}
            unoptimized
            width={previewSize}
          />
          {!disabled && (
            <Button
              className='absolute -top-2 -right-2 size-6 opacity-0 transition-opacity group-hover:opacity-100'
              onClick={() => onChange(null)}
              size='icon'
              variant='destructive'
            >
              <X className='size-3' />
            </Button>
          )}
        </div>
      ) : (
        <div className='flex items-center gap-2'>
          <button
            className='flex items-center gap-2 rounded-md border border-dashed px-4 py-3 text-muted-foreground text-sm transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            type='button'
          >
            {uploading ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <ImagePlus className='size-4' />
            )}
            {uploading ? 'Uploading...' : `Upload ${label}`}
          </button>
          {mediaItems.length > 0 && !disabled && (
            <button
              className='flex items-center gap-2 rounded-md border border-dashed px-4 py-3 text-muted-foreground text-sm transition-colors hover:border-primary/50 hover:text-foreground'
              onClick={() => setLibraryOpen(true)}
              type='button'
            >
              <FolderOpen className='size-4' />
              Library
            </button>
          )}
        </div>
      )}

      <MediaLibraryDialog
        mediaItems={mediaItems}
        onOpenChange={setLibraryOpen}
        onSelect={onChange}
        open={libraryOpen}
      />
    </div>
  )
}
