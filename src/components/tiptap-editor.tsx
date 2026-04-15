'use client'

import { Extension } from '@tiptap/core'
import { Image } from '@tiptap/extension-image'
import TipTapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import { Underline } from '@tiptap/extension-underline'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Strikethrough,
  UnderlineIcon,
  Undo,
} from 'lucide-react'
import type React from 'react'
import { useCallback, useImperativeHandle, useRef } from 'react'
import { toast } from 'sonner'
import CodeBlockShiki from 'tiptap-extension-code-block-shiki'
import { Markdown, type MarkdownStorage } from 'tiptap-markdown'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { uploadFile } from '@/lib/upload'

// Blob URL -> File mapping for deferred upload
const blobFileMap = new Map<string, File>()

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

function insertImageFile(editor: Editor, file: File): boolean {
  if (file.size > MAX_IMAGE_SIZE) {
    return false
  }
  const blobUrl = URL.createObjectURL(file)
  blobFileMap.set(blobUrl, file)
  editor.chain().focus().setImage({ src: blobUrl }).run()
  return true
}

// Custom extension to handle paste and drop of images
const ImageDropPaste = Extension.create({
  name: 'imageDropPaste',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('imageDropPaste'),
        props: {
          handlePaste(_view, event) {
            const items = event.clipboardData?.items
            if (!items) {
              return false
            }

            for (const item of items) {
              if (item.type.startsWith('image/')) {
                event.preventDefault()
                const file = item.getAsFile()
                if (file && !insertImageFile(editor, file)) {
                  toast.error('Image must be under 10MB')
                }
                return true
              }
            }
            return false
          },
          handleDrop(_view, event) {
            const files = event.dataTransfer?.files
            if (!files?.length) {
              return false
            }

            const imageFiles = Array.from(files).filter((f) =>
              f.type.startsWith('image/')
            )
            if (imageFiles.length === 0) {
              return false
            }

            event.preventDefault()
            for (const file of imageFiles) {
              if (!insertImageFile(editor, file)) {
                toast.error('Image must be under 10MB')
              }
            }
            return true
          },
        },
      }),
    ]
  },
})

export interface EditorRef {
  getEditor: () => Editor | null
  getHTML: () => string
  getMarkdown: () => string
  getText: () => string
  /**
   * Uploads all pending blob images to S3 via the /api/upload endpoint,
   * replaces blob URLs in the editor content with the returned S3 URLs,
   * and returns the final HTML.
   */
  uploadImagesAndGetHTML: () => Promise<string>
}

interface TiptapEditorProps {
  content?: string
  editable?: boolean
  onBlur?: () => void
  onChange?: (content: string) => void
  onMarkdownChange?: (markdown: string) => void
  placeholder?: string
  /** Project ID for scoping image uploads. Required for image upload support. */
  projectId?: string
  /** Ref for imperative access to editor methods. */
  ref?: React.RefObject<EditorRef | null> | null
  /** Show formatting toolbar. Defaults to true when editable. */
  toolbar?: boolean
}

export default function TiptapEditor({
  content = '',
  onChange,
  onMarkdownChange,
  onBlur,
  placeholder = 'Start writing...',
  editable = true,
  toolbar,
  projectId,
  ref,
}: TiptapEditorProps) {
  const showToolbar = toolbar ?? editable
  const fileInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      CodeBlockShiki.configure({
        themes: {
          dark: 'ayu-dark',
          light: 'min-light',
        },
        HTMLAttributes: {
          class: 'not-prose',
        },
      }),
      Placeholder.configure({ placeholder }),
      Typography,
      Image.configure({ allowBase64: true }),
      Underline.configure(),
      TipTapLink.configure({
        openOnClick: 'whenNotEditable',
        defaultProtocol: 'https',
      }),
      Markdown.configure({
        breaks: true,
        html: true,
        linkify: true,
        transformCopiedText: true,
        transformPastedText: true,
        tightLists: false,
      }),
      ImageDropPaste,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-border prose-hr:border-border max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
      if (onMarkdownChange) {
        const md = (
          editor.storage as unknown as { markdown: MarkdownStorage }
        ).markdown.getMarkdown()
        onMarkdownChange(md)
      }
    },
    onBlur: () => {
      onBlur?.()
    },
  })

  const uploadImagesAndGetHTML = useCallback(async (): Promise<string> => {
    if (!editor) {
      return ''
    }

    let html = editor.getHTML()

    // Find all blob: URLs in the HTML
    const blobUrlRegex = /blob:[^"'\s)]+/g
    const blobUrls = [...new Set(html.match(blobUrlRegex) ?? [])]

    if (blobUrls.length === 0) {
      return html
    }

    if (!projectId) {
      throw new Error('projectId is required to upload images')
    }

    const uploads = await Promise.allSettled(
      blobUrls.map(async (blobUrl) => {
        const file = blobFileMap.get(blobUrl)
        if (!file) {
          return { blobUrl, finalUrl: blobUrl }
        }

        const { url } = await uploadFile(file, projectId)

        URL.revokeObjectURL(blobUrl)
        blobFileMap.delete(blobUrl)

        return { blobUrl, finalUrl: url }
      })
    )

    for (const result of uploads) {
      if (result.status === 'fulfilled') {
        const { blobUrl, finalUrl } = result.value
        html = html.replaceAll(blobUrl, finalUrl)
      }
    }

    editor.commands.setContent(html, { emitUpdate: false })

    return html
  }, [editor, projectId])

  useImperativeHandle(ref, () => ({
    getHTML: () => editor?.getHTML() || '',
    getMarkdown: () =>
      (
        editor?.storage as unknown as { markdown: MarkdownStorage } | undefined
      )?.markdown?.getMarkdown() || '',
    getText: () => editor?.getText() || '',
    getEditor: () => editor,
    uploadImagesAndGetHTML,
  }))

  const addImageFromFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!(files?.length && editor)) {
        return
      }

      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/') && !insertImageFile(editor, file)) {
          toast.error('Image must be under 10MB')
        }
      }

      // Reset so same file can be re-selected
      e.target.value = ''
    },
    [editor]
  )

  const addLink = useCallback(() => {
    // biome-ignore lint/suspicious/noAlert: we need to prompt the user for a link
    const url = prompt('Link URL')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) {
    return null
  }
  return (
    <div className='rounded-lg border bg-background'>
      <input
        accept='image/*'
        className='hidden'
        multiple
        onChange={handleFileSelect}
        ref={fileInputRef}
        type='file'
      />

      {showToolbar && (
        <div className='sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-background px-2 py-1.5'>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            pressed={editor.isActive('heading', { level: 1 })}
            size='sm'
          >
            <Heading1 className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            pressed={editor.isActive('heading', { level: 2 })}
            size='sm'
          >
            <Heading2 className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            pressed={editor.isActive('heading', { level: 3 })}
            size='sm'
          >
            <Heading3 className='size-4' />
          </Toggle>

          <Separator className='!h-5 mx-1' orientation='vertical' />

          <Toggle
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            pressed={editor.isActive('bold')}
            size='sm'
          >
            <Bold className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            pressed={editor.isActive('italic')}
            size='sm'
          >
            <Italic className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleUnderline().run()
            }
            pressed={editor.isActive('underline')}
            size='sm'
          >
            <UnderlineIcon className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            pressed={editor.isActive('strike')}
            size='sm'
          >
            <Strikethrough className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() => editor.chain().focus().toggleCode().run()}
            pressed={editor.isActive('code')}
            size='sm'
          >
            <Code className='size-4' />
          </Toggle>

          <Separator className='!h-5 mx-1' orientation='vertical' />

          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            pressed={editor.isActive('bulletList')}
            size='sm'
          >
            <List className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            pressed={editor.isActive('orderedList')}
            size='sm'
          >
            <ListOrdered className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            pressed={editor.isActive('blockquote')}
            size='sm'
          >
            <Quote className='size-4' />
          </Toggle>
          <Toggle
            onPressedChange={() =>
              editor.chain().focus().setHorizontalRule().run()
            }
            pressed={false}
            size='sm'
          >
            <Minus className='size-4' />
          </Toggle>

          <Separator className='!h-5 mx-1' orientation='vertical' />

          <Toggle onPressedChange={addLink} pressed={false} size='sm'>
            <LinkIcon className='size-4' />
          </Toggle>
          <Toggle onPressedChange={addImageFromFile} pressed={false} size='sm'>
            <ImageIcon className='size-4' />
          </Toggle>

          <Separator className='!h-5 mx-1' orientation='vertical' />

          <Toggle
            disabled={!editor.can().undo()}
            onPressedChange={() => editor.chain().focus().undo().run()}
            pressed={false}
            size='sm'
          >
            <Undo className='size-4' />
          </Toggle>
          <Toggle
            disabled={!editor.can().redo()}
            onPressedChange={() => editor.chain().focus().redo().run()}
            pressed={false}
            size='sm'
          >
            <Redo className='size-4' />
          </Toggle>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  )
}
