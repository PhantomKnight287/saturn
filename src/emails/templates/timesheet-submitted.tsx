import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface TimesheetSubmittedEmailProps {
  entryCount: number
  memberName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  totalHours: string
  weekLabel: string
}

export default function TimesheetSubmittedEmail({
  recipientName = 'John Doe',
  memberName = 'Jane Smith',
  projectName = 'Website Redesign',
  totalHours = '32.5',
  weekLabel = 'Mar 3 – Mar 9, 2026',
  entryCount = 8,
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: TimesheetSubmittedEmailProps) {
  return (
    <EmailLayout
      accentColor='#7c3aed'
      heading='Timesheet submitted for review'
      preview={`${memberName} submitted ${totalHours}h for review — ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{memberName}</span>{' '}
        submitted a timesheet for <span style={text.strong}>{projectName}</span>{' '}
        that needs your approval.
      </Text>
      <Section style={hoursSection}>
        <Text style={hoursLabel}>Total hours</Text>
        <Text style={{ ...text.large, color: '#7c3aed' }}>{totalHours}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Member' value={memberName} />
        <InfoRow label='Week' value={weekLabel} />
        <InfoRow
          label='Entries'
          value={`${entryCount} time ${entryCount === 1 ? 'entry' : 'entries'}`}
        />
      </InfoCard>
      <ActionButton href={`${baseUrl}/${orgSlug}/${projectSlug}/time-tracking`}>
        Review Timesheet
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
