import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface TimesheetSentToClientEmailProps {
  currency: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  reportId: string
  reportTitle: string
  senderName: string
  totalAmount: string
  totalHours: string
}

export default function TimesheetSentToClientEmail({
  recipientName = 'Jane Smith',
  senderName = 'John Doe',
  projectName = 'Website Redesign',
  reportTitle = 'Week of Mar 3 – Mar 9, 2026',
  totalHours = '32.5',
  totalAmount = '$2,600.00',
  currency = 'USD',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  reportId = 'tr_abc123',
}: TimesheetSentToClientEmailProps) {
  return (
    <EmailLayout
      accentColor='#7c3aed'
      heading='Timesheet awaiting your review'
      preview={`Timesheet for review: ${reportTitle} — ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{senderName}</span> sent
        you a timesheet to review for{' '}
        <span style={text.strong}>{projectName}</span>.
      </Text>
      <Section style={hoursSection}>
        <Text style={hoursLabel}>Total hours</Text>
        <Text style={{ ...text.large, color: '#7c3aed' }}>{totalHours}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Report' value={reportTitle} />
        <InfoRow label='Project' value={projectName} />
        <InfoRow label='Amount' value={`${totalAmount} ${currency}`} />
      </InfoCard>
      <Text style={text.muted}>
        Review the detailed breakdown and either approve the timesheet or raise
        a dispute if anything needs correction.
      </Text>
      <ActionButton
        href={`${baseUrl}/${orgSlug}/${projectSlug}/time-tracking/reports/${reportId}`}
      >
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
