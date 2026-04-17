import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  QuoteBlock,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface TimesheetRejectedEmailProps {
  orgSlug: string
  projectName: string
  projectSlug: string
  reason: string
  recipientName: string
  rejectorName: string
  totalHours: string
  weekLabel: string
}

export default function TimesheetRejectedEmail({
  recipientName = 'Jane Smith',
  rejectorName = 'John Doe',
  projectName = 'Website Redesign',
  totalHours = '32.5',
  weekLabel = 'Mar 3 – Mar 9, 2026',
  reason = 'The hours logged against the API integration requirement seem too high. Could you break down what was done on Thursday and Friday?',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: TimesheetRejectedEmailProps) {
  return (
    <EmailLayout
      accentColor='#ef4444'
      heading='Timesheet rejected'
      preview={`Your timesheet for ${projectName} was rejected`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{rejectorName}</span>{' '}
        reviewed your timesheet ({totalHours}h) for{' '}
        <span style={text.strong}>{projectName}</span> and is requesting
        changes.
      </Text>
      <QuoteBlock borderColor='#ef4444'>
        <Text
          style={{
            fontSize: '14px',
            color: '#3f3f46',
            lineHeight: '22px',
            margin: '0',
            fontStyle: 'italic',
          }}
        >
          "{reason}"
        </Text>
      </QuoteBlock>
      <InfoCard>
        <InfoRow label='Week' value={weekLabel} />
        <InfoRow label='Hours' value={totalHours} />
      </InfoCard>
      <Text style={text.muted}>
        You can edit your time entries and resubmit for approval.
      </Text>
      <ActionButton
        color='#ef4444'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/time-tracking`}
      >
        Edit & Resubmit
      </ActionButton>
    </EmailLayout>
  )
}
