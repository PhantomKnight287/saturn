'use client'

import { useRouter } from '@bprogress/next/app'
import { ChevronDown, Copy, Plus, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import InvoiceCard from './_components/invoice-card'
import { InvoicePickerDialog } from './_components/invoice-picker-dialog'
import type { InvoicesClientProps } from './types'
import type { RouteImpl } from '@/types'

export function InvoicesClient({
  invoices,
  orgSlug,
  projectSlug,
  canCreate,
  role,
}: InvoicesClientProps) {
  const newUrl = `/${orgSlug}/${projectSlug}/invoices/new` as RouteImpl
  const [pickerOpen, setPickerOpen] = useState(false)
  const router = useRouter()
  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Invoices</h1>
        {canCreate && invoices.length > 0 && (
          <div className='flex items-center'>
            <Button
              className='rounded-r-none'
              kbd='c'
              onClick={() => router.push(newUrl as unknown as string)}
              size='sm'
            >
              <Plus className='size-4' />
              New Invoice
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className='rounded-l-none border-l border-l-primary-foreground/20 px-1.5'
                  size='sm'
                >
                  <ChevronDown className='size-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem asChild>
                  <Link href={newUrl}>
                    <Plus className='size-4' />
                    Blank Invoice
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPickerOpen(true)}>
                  <Copy className='size-4' />
                  From Previous Invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Create an invoice to bill your clients for completed work.
            </EmptyDescription>
          </EmptyHeader>
          {canCreate && (
            <EmptyContent>
              <Button asChild>
                <Link href={newUrl}>Create Invoice</Link>
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {invoices.map((invoice) => (
            <InvoiceCard
              invoice={invoice}
              key={invoice.id}
              orgSlug={orgSlug}
              projectSlug={projectSlug}
              role={role}
            />
          ))}
        </div>
      )}

      <InvoicePickerDialog
        invoices={invoices}
        onOpenChange={setPickerOpen}
        open={pickerOpen}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
      />
    </div>
  )
}
