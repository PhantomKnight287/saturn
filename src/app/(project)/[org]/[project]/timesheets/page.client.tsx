'use client'

import { useRouter } from '@bprogress/next/app'
import { Play, Plus, Send, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import SendToClientDialog from '@/components/send-to-client-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTimerStore } from '@/stores/timer-store'
import { BiweeklyTimesheet } from './_components/biweekly-timesheet'
import { BudgetIndicator } from './_components/budget-indicator'
import { ClientReportsView } from './_components/client-reports-view'
import { MemberRatesDialog } from './_components/member-rates-dialog'
import { MonthlyTimesheet } from './_components/monthly-timesheet'
import { SentReportsList } from './_components/sent-reports-list'
import { TeamEntriesTable } from './_components/team-entries-table'
import { TimeEntryForm } from './_components/time-entry-form'
import { TimesheetApproval } from './_components/timesheet-approval'
import { WeeklyTimesheet } from './_components/weekly-timesheet'
import { sendTimesheetToClientAction } from './actions'
import { formatMinutes } from './common'
import type { TimeTrackingPageProps } from './types'

export function TimeTrackingClient(props: TimeTrackingPageProps) {
  const {
    entries,
    projectId,
    projectName,
    orgSlug,
    projectSlug,
    isAdmin,
    isClient,
    currentMemberId,
    requirements,
    projectMembers,
    clients,
    budgetStatus,
    memberRates,
    timesheetDuration,
    timesheetReports,
    reportEntriesMap,
    reportRecipientsMap,
    clientReports,
    defaultCurrency,
    isClientInvolved,
    initialLogMinutes,
  } = props
  const [formOpen, setFormOpen] = useState(!!initialLogMinutes)
  const [formDefaultDate, setFormDefaultDate] = useState<Date | undefined>()
  const [formDefaultDuration, setFormDefaultDuration] = useState<
    number | undefined
  >(initialLogMinutes)
  const timerStartedAt = useTimerStore((s) => s.startedAt)
  const timerAccumulatedMs = useTimerStore((s) => s.accumulatedMs)
  const startTimer = useTimerStore((s) => s.start)
  const timerActive = timerStartedAt !== null || timerAccumulatedMs > 0

  useEffect(() => {
    if (initialLogMinutes) {
      const url = new URL(window.location.href)
      url.searchParams.delete('logMinutes')
      window.history.replaceState(null, '', url.toString())
    }
  }, [initialLogMinutes])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ minutes: number }>).detail
      setFormDefaultDuration(detail.minutes)
      setFormOpen(true)
    }
    window.addEventListener('timer:log', handler)
    return () => window.removeEventListener('timer:log', handler)
  }, [])
  const [ratesOpen, setRatesOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(
    new Set()
  )
  const router = useRouter()
  const [reportTitle, setReportTitle] = useState('')

  const selectedMinutes = entries
    .filter((e) => selectedEntryIds.has(e.id))
    .reduce((sum, e) => sum + e.durationMinutes, 0)

  const myEntries = entries.filter((e) => e.memberId === currentMemberId)
  const submittedEntries = entries.filter(
    (e) => e.status === 'submitted_to_admin'
  )
  const disputedReports = timesheetReports.filter(
    (r) => r.status === 'disputed'
  )

  if (isClient) {
    return (
      <div className='w-full'>
        <div className='mb-6 flex items-center justify-between'>
          <h1 className='font-semibold text-2xl'>Timesheets</h1>
        </div>
        <ClientReportsView reports={clientReports} />
      </div>
    )
  }

  return (
    <div className='w-full'>
      <div className='mb-6 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <h1 className='font-semibold text-2xl'>Timesheets</h1>
          {budgetStatus && isAdmin && (
            <BudgetIndicator budgetStatus={budgetStatus} />
          )}
        </div>
        <div className='flex items-center gap-2'>
          {isAdmin && isClientInvolved && (
            <Button
              disabled={selectedEntryIds.size === 0}
              onClick={() => setSendOpen(true)}
              size='sm'
              variant='outline'
            >
              <Send className='mr-1 size-4' />
              Send to Client
              {selectedEntryIds.size > 0 && ` (${selectedEntryIds.size})`}
            </Button>
          )}
          {isAdmin && (
            <Button
              kbd='r'
              onClick={() => setRatesOpen(true)}
              size='sm'
              variant='outline'
            >
              <Settings2 className='mr-1 size-4' />
              Rates
            </Button>
          )}
          <Button
            disabled={timerActive}
            kbd='t'
            onClick={() =>
              startTimer({ orgSlug, projectSlug, projectId, projectName })
            }
            size='sm'
            variant='outline'
          >
            <Play className='mr-1 size-4' />
            {timerStartedAt ? 'Recording…' : 'Record'}
          </Button>
          <Button kbd='l' onClick={() => setFormOpen(true)} size='sm'>
            <Plus className='mr-1 size-4' />
            Log Time
          </Button>
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? 'team' : 'timesheet'}>
        <TabsList className='mb-4'>
          <TabsTrigger value='timesheet'>My Timesheet</TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value='team'>Team</TabsTrigger>
              <TabsTrigger value='approval'>
                Approval
                {submittedEntries.length > 0 && (
                  <span className='ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs'>
                    {submittedEntries.length}
                  </span>
                )}
              </TabsTrigger>
              {isClientInvolved && (
                <TabsTrigger value='reports'>
                  Client Reports
                  {disputedReports.length > 0 && (
                    <span className='ml-1.5 inline-flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs'>
                      {disputedReports.length}
                    </span>
                  )}
                </TabsTrigger>
              )}
            </>
          )}
        </TabsList>

        <TabsContent value='timesheet'>
          {timesheetDuration === 'monthly' ? (
            <MonthlyTimesheet
              currentMemberId={currentMemberId}
              entries={myEntries}
              isAdmin={false}
              isClientInvolved={isClientInvolved}
              onAddEntry={(date) => {
                setFormDefaultDate(date)
                setFormOpen(true)
              }}
              projectId={projectId}
              requirements={requirements}
            />
          ) : timesheetDuration === 'biweekly' ? (
            <BiweeklyTimesheet
              currentMemberId={currentMemberId}
              entries={myEntries}
              isAdmin={false}
              isClientInvolved={isClientInvolved}
              onAddEntry={() => setFormOpen(true)}
              projectId={projectId}
              requirements={requirements}
            />
          ) : (
            <WeeklyTimesheet
              currentMemberId={currentMemberId}
              entries={myEntries}
              isAdmin={false}
              isClientInvolved={isClientInvolved}
              onAddEntry={() => setFormOpen(true)}
              projectId={projectId}
              requirements={requirements}
            />
          )}
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value='team'>
              <TeamEntriesTable
                currentMemberId={currentMemberId}
                entries={entries.filter((e) => e.status !== 'draft')}
                isClientInvolved={isClientInvolved}
                onSelectionChange={setSelectedEntryIds}
                projectId={projectId}
                projectMembers={projectMembers}
                requirements={requirements}
                selectedIds={selectedEntryIds}
              />
            </TabsContent>

            <TabsContent value='approval'>
              <TimesheetApproval
                entries={submittedEntries}
                projectId={projectId}
                projectMembers={projectMembers}
                requirements={requirements}
              />
            </TabsContent>

            {isClientInvolved && (
              <TabsContent value='reports'>
                <SentReportsList
                  orgSlug={orgSlug}
                  projectName={projectName}
                  projectSlug={projectSlug}
                  reportEntriesMap={reportEntriesMap}
                  reportRecipientsMap={reportRecipientsMap}
                  reports={timesheetReports}
                />
              </TabsContent>
            )}
          </>
        )}
      </Tabs>

      <TimeEntryForm
        defaultDate={formDefaultDate}
        defaultDurationMinutes={formDefaultDuration}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setFormDefaultDate(undefined)
            setFormDefaultDuration(undefined)
          }
        }}
        open={formOpen}
        projectId={projectId}
        requirements={requirements}
      />

      {isAdmin && isClientInvolved && (
        <SendToClientDialog
          clients={clients}
          description={`Send ${selectedEntryIds.size} selected ${selectedEntryIds.size === 1 ? 'entry' : 'entries'} (${formatMinutes(selectedMinutes)}) for client review.`}
          onOpenChange={(open) => {
            setSendOpen(open)
            if (!open) {
              setSelectedEntryIds(new Set())
              setReportTitle('')
            }
          }}
          onSend={async (clientMemberIds) => {
            await sendTimesheetToClientAction({
              projectId,
              clientMemberIds,
              title: reportTitle.trim(),
              timeEntryIds: [...selectedEntryIds],
              currency: defaultCurrency ?? 'USD',
            })
            toast.success('Timesheet sent to client')
            setSendOpen(false)
            setSelectedEntryIds(new Set())
            setReportTitle('')
            router.refresh()
          }}
          open={sendOpen}
          recipientLabel='client'
          sendDisabled={!reportTitle.trim()}
          title='Send Timesheet to Client'
        >
          <div className='space-y-1.5'>
            <Label>Report Title</Label>
            <Input
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder='e.g. Week of Mar 3 – Mar 9'
              value={reportTitle}
            />
          </div>
        </SendToClientDialog>
      )}

      {isAdmin && (
        <MemberRatesDialog
          defaultCurrency={defaultCurrency}
          existingRates={memberRates}
          onOpenChange={setRatesOpen}
          open={ratesOpen}
          projectId={projectId}
          projectMembers={projectMembers}
        />
      )}
    </div>
  )
}
