'use client'

import { useRouter } from '@bprogress/next/app'
import { DollarSign, Filter, Pencil, Receipt, Trash2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { deleteExpenseAction } from '../actions'
import { formatCurrency } from '../common'
import type {
  ExpenseCategory,
  ExpenseRecipient,
  ExpenseWithDetails,
} from '../types'
import { ExpenseForm } from './expense-form'

const statusConfig: Record<
  string,
  {
    label: string
    variant: 'secondary' | 'default' | 'destructive'
    className: string
  }
> = {
  draft: { label: 'Draft', variant: 'secondary', className: '' },
  submitted_to_admin: { label: 'Submitted', variant: 'default', className: '' },
  admin_accepted: {
    label: 'Approved',
    variant: 'default',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  admin_rejected: { label: 'Rejected', variant: 'destructive', className: '' },
  submitted_to_client: {
    label: 'Sent to Client',
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  client_accepted: {
    label: 'Client Approved',
    variant: 'default',
    className:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  },
  client_rejected: {
    label: 'Client Rejected',
    variant: 'destructive',
    className: '',
  },
}

interface ExpensesTableProps {
  canSubmit: boolean
  categories: ExpenseCategory[]
  currentMemberId: string
  expenses: ExpenseWithDetails[]
  isAdmin: boolean
  isClientInvolved?: boolean
  onToggleAll: () => void
  onToggleSelect: (id: string) => void
  projectId: string
  recipients: ExpenseRecipient[]
  selectedIds: Set<string>
}

export function ExpensesTable({
  expenses,
  categories,
  projectId,
  currentMemberId,
  isAdmin,
  canSubmit,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  isClientInvolved = true,
  recipients,
}: ExpensesTableProps) {
  const router = useRouter()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterBillable, setFilterBillable] = useState<string>('all')
  const [editExpense, setEditExpense] = useState<ExpenseWithDetails | null>(
    null
  )

  const deleteAction = useAction(deleteExpenseAction, {
    onSuccess: () => {
      toast.success('Expense deleted')
      router.refresh()
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? 'Failed to delete expense'),
  })

  const filtered = expenses.filter((e) => {
    if (filterStatus !== 'all' && e.status !== filterStatus) {
      return false
    }
    if (filterCategory !== 'all' && e.categoryId !== filterCategory) {
      return false
    }
    if (filterBillable === 'billable' && !e.billable) {
      return false
    }
    if (filterBillable === 'non-billable' && e.billable) {
      return false
    }
    return true
  })

  const totalCents = filtered.reduce((sum, e) => sum + e.amountCents, 0)

  const hasActiveFilters =
    filterStatus !== 'all' ||
    filterCategory !== 'all' ||
    filterBillable !== 'all'

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id))

  if (filtered.length === 0 && !hasActiveFilters) {
    return null
  }

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <Filter className='size-4 text-muted-foreground' />
        <Select onValueChange={setFilterStatus} value={filterStatus}>
          <SelectTrigger className='h-8 w-40'>
            <SelectValue placeholder='All statuses' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All statuses</SelectItem>
            <SelectItem value='draft'>Draft</SelectItem>
            <SelectItem value='submitted_to_admin'>Submitted</SelectItem>
            <SelectItem value='admin_accepted'>Approved</SelectItem>
            <SelectItem value='admin_rejected'>Rejected</SelectItem>
            <SelectItem value='submitted_to_client'>Sent to Client</SelectItem>
            <SelectItem value='client_accepted'>Client Approved</SelectItem>
            <SelectItem value='client_rejected'>Client Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={setFilterCategory} value={filterCategory}>
          <SelectTrigger className='h-8 w-40'>
            <SelectValue placeholder='All categories' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setFilterBillable} value={filterBillable}>
          <SelectTrigger className='h-8 w-36'>
            <SelectValue placeholder='All' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All</SelectItem>
            <SelectItem value='billable'>Billable</SelectItem>
            <SelectItem value='non-billable'>Non-billable</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            className='h-8 text-xs'
            onClick={() => {
              setFilterStatus('all')
              setFilterCategory('all')
              setFilterBillable('all')
            }}
            size='sm'
            variant='ghost'
          >
            Clear filters
          </Button>
        )}
        <span className='ml-auto text-muted-foreground text-sm'>
          {filtered.length} {filtered.length === 1 ? 'expense' : 'expenses'} ·{' '}
          {formatCurrency(totalCents)}
        </span>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No expenses found</EmptyTitle>
            <EmptyDescription>
              No expenses match the selected filters.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {(isAdmin || canSubmit) && (
                      <TableHead className='w-10'>
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={onToggleAll}
                        />
                      </TableHead>
                    )}
                    <TableHead>Member</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className='w-[100px]'>Date</TableHead>
                    <TableHead className='w-[100px] text-right'>
                      Amount
                    </TableHead>
                    <TableHead className='w-[120px] text-center'>
                      Status
                    </TableHead>
                    <TableHead className='w-16' />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((expense) => {
                    const baseCfg =
                      statusConfig[expense.status] ?? statusConfig.draft
                    const cfg =
                      !isClientInvolved &&
                      (expense.status === 'submitted_to_client' ||
                        expense.status === 'client_accepted' ||
                        expense.status === 'client_rejected')
                        ? {
                            ...baseCfg,
                            label:
                              expense.status === 'client_accepted'
                                ? 'Completed'
                                : expense.status === 'client_rejected'
                                  ? 'Withdrawn'
                                  : 'Finalized',
                          }
                        : baseCfg
                    const canEdit =
                      isAdmin ||
                      (expense.memberId === currentMemberId &&
                        (expense.status === 'draft' ||
                          expense.status === 'admin_rejected'))
                    const canDelete =
                      isAdmin ||
                      (expense.memberId === currentMemberId &&
                        expense.status === 'draft')

                    return (
                      <TableRow key={expense.id}>
                        {(isAdmin || canSubmit) && (
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(expense.id)}
                              onCheckedChange={() => onToggleSelect(expense.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className='text-sm'>
                          {expense.memberName ?? expense.memberEmail ?? '—'}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            {expense.description ? (
                              <HoverCard openDelay={0}>
                                <HoverCardTrigger asChild>
                                  <span className='line-clamp-1 max-w-52 cursor-help text-sm underline decoration-muted-foreground/40 decoration-dashed underline-offset-4'>
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
                              <span className='line-clamp-1 max-w-52 text-sm'>
                                {expense.title}
                              </span>
                            )}
                            {expense.billable && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <DollarSign className='size-3 text-green-600' />
                                </TooltipTrigger>
                                <TooltipContent>Billable</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-sm'>
                          {expense.categoryName ? (
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
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className='whitespace-nowrap text-sm'>
                          {new Date(expense.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className='text-right font-medium text-sm'>
                          {formatCurrency(
                            expense.amountCents,
                            expense.currency
                          )}
                        </TableCell>
                        <TableCell className='text-center'>
                          {(() => {
                            const expenseRecips = recipients.filter(
                              (r) => r.expenseId === expense.id
                            )
                            const hasRecipientInfo =
                              isAdmin &&
                              expenseRecips.length > 0 &&
                              (expense.status === 'submitted_to_client' ||
                                expense.status === 'client_accepted' ||
                                expense.status === 'client_rejected')
                            const hasRejectReason =
                              (expense.status === 'admin_rejected' ||
                                expense.status === 'client_rejected') &&
                              expense.rejectReason

                            if (hasRecipientInfo || hasRejectReason) {
                              return (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge
                                      className={`cursor-help text-xs ${cfg!.className}`}
                                      variant={cfg!.variant}
                                    >
                                      {cfg!.label}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    className='max-w-xs'
                                    side='left'
                                  >
                                    {hasRejectReason && (
                                      <div>
                                        <p className='font-medium'>Reason:</p>
                                        <p>{expense.rejectReason}</p>
                                      </div>
                                    )}
                                    {hasRecipientInfo && (
                                      <div className='space-y-1'>
                                        <p className='font-medium'>
                                          Recipients:
                                        </p>
                                        {expenseRecips.map((r) => (
                                          <p className='text-xs' key={r.id}>
                                            {r.clientName ?? r.clientEmail} —{' '}
                                            <span className='capitalize'>
                                              {r.status}
                                            </span>
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              )
                            }

                            return (
                              <Badge
                                className={`text-xs ${cfg!.className}`}
                                variant={cfg!.variant}
                              >
                                {cfg!.label}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            {canEdit && (
                              <Button
                                className='size-7'
                                onClick={() => setEditExpense(expense)}
                                size='icon'
                                variant='ghost'
                              >
                                <Pencil className='size-3.5' />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                className='size-7 text-destructive'
                                onClick={() =>
                                  deleteAction.execute({
                                    expenseId: expense.id,
                                  })
                                }
                                size='icon'
                                variant='ghost'
                              >
                                <Trash2 className='size-3.5' />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {editExpense && (
        <ExpenseForm
          categories={categories}
          editExpense={editExpense}
          onOpenChange={(open) => {
            if (!open) {
              setEditExpense(null)
            }
          }}
          open={!!editExpense}
          projectId={projectId}
        />
      )}
    </div>
  )
}
