'use client'

import { useRouter } from '@bprogress/next/app'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { approveExpensesAction, rejectExpensesAction } from '../actions'
import { formatCurrency } from '../common'
import type { ExpenseWithDetails } from '../types'

interface ExpenseApprovalProps {
  expenses: ExpenseWithDetails[]
}

export function ExpenseApproval({ expenses }: ExpenseApprovalProps) {
  const rejectReasonId = useId()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const router = useRouter()

  const approveAction = useAction(approveExpensesAction, {
    onSuccess: () => {
      toast.success('Expenses approved')
      setSelectedIds(new Set())
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to approve expenses')
    },
  })

  const rejectAction = useAction(rejectExpensesAction, {
    onSuccess: () => {
      toast.success('Expenses rejected')
      setSelectedIds(new Set())
      setRejectOpen(false)
      setRejectReason('')
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to reject expenses')
    },
  })

  const grouped = expenses.reduce<Record<string, ExpenseWithDetails[]>>(
    (acc, expense) => {
      const key = expense.memberId
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(expense)
      return acc
    },
    {}
  )

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

  function toggleMemberGroup(memberExpenses: ExpenseWithDetails[]) {
    const allSelected = memberExpenses.every((e) => selectedIds.has(e.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const expense of memberExpenses) {
        if (allSelected) {
          next.delete(expense.id)
        } else {
          next.add(expense.id)
        }
      }
      return next
    })
  }

  if (expenses.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <CheckCircle2 />
          </EmptyMedia>
          <EmptyTitle>No pending approvals</EmptyTitle>
          <EmptyDescription>
            All submitted expenses have been reviewed.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>
          {expenses.length} submitted{' '}
          {expenses.length === 1 ? 'expense' : 'expenses'} awaiting review
        </p>
        <div className='flex items-center gap-2'>
          <Button
            disabled={selectedIds.size === 0 || rejectAction.isPending}
            onClick={() => setRejectOpen(true)}
            size='sm'
            variant='outline'
          >
            <XCircle className='size-4' />
            Reject
          </Button>
          <Button
            disabled={selectedIds.size === 0 || approveAction.isPending}
            onClick={() =>
              approveAction.execute({ expenseIds: Array.from(selectedIds) })
            }
            size='sm'
          >
            <CheckCircle2 className='size-4' />
            {approveAction.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </div>

      {Object.entries(grouped).map(([memberId, memberExpenses]) => {
        const totalCents = memberExpenses.reduce(
          (sum, e) => sum + e.amountCents,
          0
        )
        const allSelected = memberExpenses.every((e) => selectedIds.has(e.id))
        const memberName =
          memberExpenses[0]?.memberName ??
          memberExpenses[0]?.memberEmail ??
          'Unknown'

        return (
          <Card key={memberId}>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => toggleMemberGroup(memberExpenses)}
                  />
                  <div>
                    <CardTitle className='text-base'>{memberName}</CardTitle>
                    <p className='text-muted-foreground text-sm'>
                      {memberExpenses.length}{' '}
                      {memberExpenses.length === 1 ? 'expense' : 'expenses'} ·{' '}
                      {formatCurrency(totalCents)}
                    </p>
                  </div>
                </div>
                <Badge variant='secondary'>{formatCurrency(totalCents)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {memberExpenses.map((expense) => (
                  <div
                    className='flex items-center gap-3 rounded-md border px-3 py-2'
                    key={expense.id}
                  >
                    <Checkbox
                      checked={selectedIds.has(expense.id)}
                      onCheckedChange={() => toggleSelect(expense.id)}
                    />
                    <div className='min-w-0 flex-1'>
                      {expense.description ? (
                        <HoverCard>
                          <HoverCardTrigger asChild>
                            <p className='cursor-help truncate text-sm underline decoration-muted-foreground/40 decoration-dashed underline-offset-4'>
                              {expense.description}
                            </p>
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
                        <p className='truncate text-sm'>{expense.title}</p>
                      )}
                      <p className='text-muted-foreground text-xs'>
                        {expense.categoryName ?? 'Uncategorized'} ·{' '}
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      {expense.billable && (
                        <Badge className='text-xs' variant='outline'>
                          Billable
                        </Badge>
                      )}
                      <span className='font-medium text-sm'>
                        {formatCurrency(expense.amountCents, expense.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Dialog onOpenChange={setRejectOpen} open={rejectOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Reject Expenses</DialogTitle>
            <DialogDescription>
              Provide a reason so the team member can make corrections and
              resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2'>
            <Label htmlFor={rejectReasonId}>Reason</Label>
            <Textarea
              id={rejectReasonId}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder='Please explain what needs to be corrected...'
              rows={3}
              value={rejectReason}
            />
          </div>
          <DialogFooter>
            <Button onClick={() => setRejectOpen(false)} variant='outline'>
              Cancel
            </Button>
            <Button
              disabled={!rejectReason.trim() || rejectAction.isPending}
              loading={rejectAction.isPending}
              onClick={() =>
                rejectAction.execute({
                  expenseIds: Array.from(selectedIds),
                  reason: rejectReason,
                })
              }
              variant='destructive'
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
