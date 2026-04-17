import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  Badge,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface TimesheetClientRespondedEmailProps {
  action: 'approved' | 'disputed'
  clientName: string
  disputeReason?: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  reportId: string
  reportTitle: string
  totalHours: string
}

export default function TimesheetClientRespondedEmail({
  recipientName = 'John Doe',
  clientName = 'Jane Smith',
  projectName = 'Website Redesign',
  reportTitle = 'Week of Mar 3 – Mar 9, 2026',
  totalHours = '32.5',
  action = 'approved',
  disputeReason,
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  reportId = 'tr_abc123',
}: TimesheetClientRespondedEmailProps) {
  const isApproved = action === 'approved'

  return (
    <EmailLayout
      accentColor={isApproved ? '#16a34a' : '#dc2626'}
      heading={`Timesheet ${isApproved ? 'approved' : 'disputed'} by client`}
      preview={`Timesheet ${action}: ${reportTitle} — ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{clientName}</span>{' '}
        {isApproved ? 'approved' : 'disputed'} the timesheet for{' '}
        <span style={text.strong}>{projectName}</span>.
      </Text>
      <InfoCard>
        <InfoRow label='Report' value={reportTitle} />
        <InfoRow label='Total hours' value={totalHours} />
        <InfoRow
          label='Status'
          value={
            <Badge color={isApproved ? '#16a34a' : '#dc2626'}>
              {isApproved ? 'Approved' : 'Disputed'}
            </Badge>
          }
        />
      </InfoCard>
      {!isApproved && disputeReason && (
        <InfoCard>
          <InfoRow label='Reason' value={disputeReason} />
        </InfoCard>
      )}
      <ActionButton
        href={`${baseUrl}/${orgSlug}/${projectSlug}/time-tracking/reports/${reportId}`}
      >
        View Details
      </ActionButton>
    </EmailLayout>
  )
}
