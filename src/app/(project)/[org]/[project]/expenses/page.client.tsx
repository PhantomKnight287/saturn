'use client'

import { useRouter } from '@bprogress/next/app'
import { Plus, Receipt, Send, Settings2 } from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { useState } from 'react'
import { toast } from 'sonner'
import SendToClientDialog from '@/components/send-to-client-dialog'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoryManager } from './_components/category-manager'
import { ClientExpensesView } from './_components/client-expenses-view'
import { ExpenseApproval } from './_components/expense-approval'
import { ExpenseForm } from './_components/expense-form'
import { ExpensesTable } from './_components/expenses-table'
import { sendExpensesToClientAction, submitExpensesAction } from './actions'
import type { ExpensesClientProps } from './types'

export default function ExpensesClient({
  expenses,
  categories,
  allCategories,
  clients,
  canCreate,
  canSubmit,
  isAdmin,
  isClient,
  projectId,
  organizationId,
  defaultCurrency,
  currentMemberId,
  isClientInvolved,
  recipients,
}: ExpensesClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [sendToClientOpen, setSendToClientOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const submitAction = useAction(submitExpensesAction, {
    onSuccess: () => {
      toast.success('Expenses submitted for approval')
      setSelectedIds(new Set())
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Failed to submit expenses')
    },
  })

  const mySubmittableExpenses = expenses.filter(
    (e) =>
      e.memberId === currentMemberId &&
      (e.status === 'draft' || e.status === 'admin_rejected')
  )
  const submittedExpenses = expenses.filter(
    (e) => e.status === 'submitted_to_admin'
  )
  const sendableExpenses = expenses.filter(
    (e) => e.status === 'admin_accepted' || e.status === 'client_rejected'
  )

  const selectedSubmittableIds = [...selectedIds].filter((id) =>
    mySubmittableExpenses.some((e) => e.id === id)
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

  function toggleAll() {
    const allSelected = expenses.every((e) => selectedIds.has(e.id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)))
    }
  }
  const { execute, isExecuting } = useAction(sendExpensesToClientAction, {
    onSuccess() {
      toast.success('Expenses sent to client')
      setSendToClientOpen(false)
      router.refresh()
    },
    onError({ error }) {
      toast.error(error.serverError)
    },
  })

  if (isClient) {
    return (
      <div className='w-full'>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='font-semibold text-2xl'>Expenses</h1>
        </div>
        <ClientExpensesView
          currentMemberId={currentMemberId}
          expenses={expenses}
          recipients={recipients}
        />
      </div>
    )
  }

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='font-semibold text-2xl'>Expenses</h1>
        <div className='flex items-center gap-2'>
          {isAdmin && isClientInvolved && sendableExpenses.length > 0 && (
            <Button
              disabled={selectedIds.size === 0}
              onClick={() => setSendToClientOpen(true)}
              size='sm'
              variant='outline'
            >
              <Send className='size-4' />
              Send to Client
            </Button>
          )}
          {!isAdmin && canSubmit && selectedSubmittableIds.length > 0 && (
            <Button
              disabled={submitAction.isPending}
              loading={submitAction.isPending}
              onClick={() =>
                submitAction.execute({ expenseIds: selectedSubmittableIds })
              }
              size='sm'
              variant='outline'
            >
              Submit (${selectedSubmittableIds.length})
            </Button>
          )}
          {isAdmin && (
            <Button
              onClick={() => setCategoriesOpen(true)}
              size='sm'
              variant='outline'
            >
              <Settings2 className='size-4' />
              Categories
            </Button>
          )}
          {canCreate && (
            <Button kbd='c' onClick={() => setFormOpen(true)} size='sm'>
              <Plus className='size-4' />
              Log Expense
            </Button>
          )}
        </div>
      </div>

      {expenses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No expenses yet</EmptyTitle>
            <EmptyDescription>
              Track project expenses and reimbursements.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Tabs defaultValue={isAdmin ? 'all' : 'all'}>
          <TabsList className='mb-4'>
            <TabsTrigger value='all'>All Expenses</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value='approval'>
                Approval
                {submittedExpenses.length > 0 && (
                  <span className='ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs'>
                    {submittedExpenses.length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value='all'>
            <ExpensesTable
              canSubmit={canSubmit}
              categories={categories}
              currentMemberId={currentMemberId}
              expenses={expenses}
              isAdmin={isAdmin}
              isClientInvolved={isClientInvolved}
              onToggleAll={toggleAll}
              onToggleSelect={toggleSelect}
              projectId={projectId}
              recipients={recipients}
              selectedIds={selectedIds}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value='approval'>
              <ExpenseApproval expenses={submittedExpenses} />
            </TabsContent>
          )}
        </Tabs>
      )}

      {canCreate && (
        <ExpenseForm
          categories={categories}
          defaultCurrency={defaultCurrency}
          onOpenChange={setFormOpen}
          open={formOpen}
          projectId={projectId}
        />
      )}

      {isAdmin && (
        <CategoryManager
          categories={allCategories}
          onOpenChange={setCategoriesOpen}
          open={categoriesOpen}
          organizationId={organizationId}
        />
      )}
      {isAdmin && isClientInvolved && (
        <SendToClientDialog
          clients={clients}
          description='Select clients to send the selected expense(s) to for review and sign-off. They will receive an email notification.'
          emptyMessage='No clients assigned to this project. Add clients from the Team page first.'
          onOpenChange={setSendToClientOpen}
          onSend={(clientIds) => {
            execute({
              clientMemberIds: clientIds,
              expenseIds: Array.from(selectedIds),
            })
          }}
          open={sendToClientOpen}
          recipientLabel='client'
          sendDisabled={isExecuting}
          title='Send for Sign'
        />
      )}
    </div>
  )
}
