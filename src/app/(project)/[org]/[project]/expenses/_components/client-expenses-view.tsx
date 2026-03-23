'use client'

import { useRouter } from '@bprogress/next/app'
import { CheckCircle2, Receipt, XCircle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { clientRespondExpensesAction } from '../actions'
import { formatCurrency } from '../common'
import type { ExpenseWithDetails } from '../types'

interface ClientExpensesViewProps {
  expenses: ExpenseWithDetails[]
}

export function ClientExpensesView({ expenses }: ClientExpensesViewProps) {
  const rejectReasonId = useId()
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const sentExpenses = expenses.filter(
    (e) => e.status === 'submitted_to_client'
  )
  const respondedExpenses = expenses.filter(
    (e) => e.status === 'client_accepted' || e.status === 'client_rejected'
  )

  const respondAction = useAction(clientRespondExpensesAction, {
    onSuccess: ({ input }) => {
      toast.success(
        `Expenses ${input.action === 'approve' ? 'approved' : 'rejected'}`
      )
      setSelectedIds(new Set())
      setRejectOpen(false)
      setRejectReason('')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to respond')
    },
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (expenses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <Receipt />
          </EmptyMedia>
          <EmptyTitle>No expenses</EmptyTitle>
          <EmptyDescription>
            No expenses have been sent to you for review yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className='space-y-6'>
      {sentExpenses.length > 0 && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h2 className='font-medium text-lg'>
              Pending Review ({sentExpenses.length})
            </h2>
            <div className='flex items-center gap-2'>
              <Button
                disabled={selectedIds.size === 0 || respondAction.isPending}
                onClick={() => setRejectOpen(true)}
                size='sm'
                variant='outline'
              >
                <XCircle className='size-4' />
                Reject
              </Button>
              <Button
                disabled={selectedIds.size === 0 || respondAction.isPending}
                onClick={() =>
                  respondAction.execute({
                    expenseIds: [...selectedIds],
                    action: 'approve',
                  })
                }
                size='sm'
              >
                <CheckCircle2 className='size-4' />
                {respondAction.isPending ? 'Saving...' : 'Approve'}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-10'>
                      <Checkbox
                        checked={
                          sentExpenses.length > 0 &&
                          sentExpenses.every((e) => selectedIds.has(e.id))
                        }
                        onCheckedChange={() => {
                          const allSelected = sentExpenses.every((e) =>
                            selectedIds.has(e.id)
                          )
                          setSelectedIds((prev) => {
                            const next = new Set(prev)
                            for (const e of sentExpenses) {
                              if (allSelected) {
                                next.delete(e.id)
                              } else {
                                next.add(e.id)
                              }
                            }
                            return next
                          })
                        }}
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(expense.id)}
                          onCheckedChange={() => toggleSelect(expense.id)}
                        />
                      </TableCell>
                      <TableCell className='text-sm'>
                        {expense.description ? (
                          <HoverCard openDelay={0}>
                            <HoverCardTrigger asChild>
                              <span className='cursor-help underline decoration-muted-foreground/40 decoration-dashed underline-offset-4'>
                                {expense.title}
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent
                              align='start'
                              className='w-80'
                              side='bottom'
                            >
                              <div className='space-y-1'>
                                <p className='font-medium text-sm'>
                                  {expense.title}
                                </p>
                                <p className='whitespace-pre-wrap text-muted-foreground text-sm'>
                                  {expense.description}
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          expense.title
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.categoryName && (
                          <Badge
                            className='text-xs'
                            style={
                              expense.categoryColor
                                ? {
                                    borderColor: expense.categoryColor,
                                    color: expense.categoryColor,
                                  }
                                : undefined
                            }
                            variant='outline'
                          >
                            {expense.categoryName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-sm'>
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className='text-right font-medium text-sm'>
                        {formatCurrency(expense.amountCents, expense.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {respondedExpenses.length > 0 && (
        <div className='space-y-4'>
          <h2 className='font-medium text-lg'>History</h2>
          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className='text-right'>Amount</TableHead>
                    <TableHead className='text-center'>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {respondedExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className='text-sm'>
                        {expense.description ? (
                          <HoverCard openDelay={0}>
                            <HoverCardTrigger asChild>
                              <span className='cursor-help underline decoration-muted-foreground/40 decoration-dashed underline-offset-4'>
                                {expense.title}
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent
                              align='start'
                              className='w-80'
                              side='bottom'
                            >
                              <div className='space-y-1'>
                                <p className='font-medium text-sm'>
                                  {expense.title}
                                </p>
                                <p className='whitespace-pre-wrap text-muted-foreground text-sm'>
                                  {expense.description}
                                </p>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          expense.title
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.categoryName && (
                          <Badge
                            className='text-xs'
                            style={
                              expense.categoryColor
                                ? {
                                    borderColor: expense.categoryColor,
                                    color: expense.categoryColor,
                                  }
                                : undefined
                            }
                            variant='outline'
                          >
                            {expense.categoryName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-sm'>
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className='text-right font-medium text-sm'>
                        {formatCurrency(expense.amountCents, expense.currency)}
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge
                          className={
                            expense.status === 'client_accepted'
                              ? 'bg-emerald-100 text-emerald-800 text-xs dark:bg-emerald-900 dark:text-emerald-300'
                              : 'text-xs'
                          }
                          variant={
                            expense.status === 'client_accepted'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {expense.status === 'client_accepted'
                            ? 'Approved'
                            : 'Rejected'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog onOpenChange={setRejectOpen} open={rejectOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Reject Expenses</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting these expenses.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor={rejectReasonId}>Reason</Label>
            <Textarea
              id={rejectReasonId}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder='Please explain why these expenses are being rejected...'
              rows={3}
              value={rejectReason}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setRejectOpen(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!rejectReason.trim() || respondAction.isPending}
              onClick={() =>
                respondAction.execute({
                  expenseIds: [...selectedIds],
                  action: 'reject',
                  reason: rejectReason,
                })
              }
              variant='destructive'
            >
              {respondAction.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
