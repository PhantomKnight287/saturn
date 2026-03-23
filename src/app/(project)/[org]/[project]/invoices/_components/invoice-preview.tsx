'use client'

import { pdf } from '@react-pdf/renderer'
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { Button } from '@/components/ui/button'
import type { InvoicePDFData } from '../types'
import InvoicePDF from './invoice-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface InvoicePreviewProps {
  data: InvoicePDFData
}

export default function InvoicePreview({ data }: InvoicePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const blob = await pdf(<InvoicePDF data={dataRef.current} />).toBlob()
      setBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev)
        }
        return URL.createObjectURL(blob)
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    } finally {
      setLoading(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: generate not needed here
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      generate()
    }, 1500)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [JSON.stringify(data)])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      setBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev)
        }
        return null
      })
    }
  }, [])

  const handleDownload = () => {
    if (!blobUrl) {
      return
    }
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${data.invoiceNumber || 'invoice'}.pdf`
    a.click()
  }

  return (
    <div className='rounded-lg border bg-muted/30'>
      <div className='flex items-center justify-between border-b px-4 py-3'>
        <h3 className='flex items-center gap-2 font-medium text-sm'>
          <FileText className='size-4' />
          PDF Preview
        </h3>
        <div className='flex items-center gap-2'>
          <Button
            disabled={loading}
            onClick={generate}
            size='sm'
            variant='ghost'
          >
            <RefreshCw
              className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
            />
          </Button>
          <Button
            disabled={!blobUrl || loading}
            onClick={handleDownload}
            size='sm'
            variant='outline'
          >
            <Download className='size-4' />
            Download
          </Button>
        </div>
      </div>
      <div className='flex items-center justify-center overflow-auto p-4'>
        {loading ? (
          <div className='flex h-[600px] items-center justify-center'>
            <Loader2 className='size-6 animate-spin text-muted-foreground' />
          </div>
        ) : error ? (
          <div className='flex h-[400px] flex-col items-center justify-center gap-3'>
            <p className='text-muted-foreground text-sm'>{error}</p>
            <Button onClick={generate} size='sm' variant='outline'>
              <RefreshCw className='size-3.5' />
              Retry
            </Button>
          </div>
        ) : blobUrl ? (
          <Document error={null} file={blobUrl} loading={null}>
            <Page
              pageNumber={1}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              width={520}
            />
          </Document>
        ) : (
          <div className='flex h-[400px] items-center justify-center'>
            <p className='text-muted-foreground text-sm'>
              Preview will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
