import { Section, Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface TimesheetApprovedEmailProps {
  approverName: string
  entryCount: number
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  totalHours: string
  weekLabel: string
}

export default function TimesheetApprovedEmail({
  recipientName = 'Jane Smith',
  approverName = 'John Doe',
  projectName = 'Website Redesign',
  totalHours = '32.5',
  weekLabel = 'Mar 3 – Mar 9, 2026',
  entryCount = 8,
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: TimesheetApprovedEmailProps) {
  return (
    <EmailLayout
      accentColor='#16a34a'
      heading='Timesheet approved'
      preview={`Your timesheet for ${projectName} has been approved`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{approverName}</span>{' '}
        approved your timesheet for{' '}
        <span style={text.strong}>{projectName}</span>.
      </Text>
      <Section style={hoursSection}>
        <Text style={hoursLabel}>Approved hours</Text>
        <Text style={{ ...text.large, color: '#16a34a' }}>{totalHours}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Week' value={weekLabel} />
        <InfoRow
          label='Entries'
          value={`${entryCount} time ${entryCount === 1 ? 'entry' : 'entries'}`}
        />
      </InfoCard>
      <ActionButton
        color='#16a34a'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/time-tracking`}
      >
        View Timesheet
      </ActionButton>
    </EmailLayout>
  )
}

const hoursSection = {
  textAlign: 'center' as const,
  padding: '20px 0 8px',
}

const hoursLabel = {
  fontSize: '13px',
  color: '#71717a',
  fontWeight: '500' as const,
  margin: '0 0 4px',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
