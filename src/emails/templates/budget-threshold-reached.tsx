import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface BudgetThresholdReachedEmailProps {
  hoursTotal: string
  hoursUsed: string
  organizationName: string
  orgSlug: string
  percentageUsed: number
  projectName: string
  projectSlug: string
  recipientName: string
}

export default function BudgetThresholdReachedEmail({
  recipientName = 'John Doe',
  projectName = 'Website Redesign',
  organizationName = 'Acme Studio',
  percentageUsed = 85,
  hoursUsed = '170',
  hoursTotal = '200',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: BudgetThresholdReachedEmailProps) {
  const isOver = percentageUsed >= 100
  const accentColor = isOver ? '#ef4444' : '#f59e0b'

  return (
    <EmailLayout
      accentColor={accentColor}
      heading={isOver ? 'Budget exceeded' : 'Budget threshold reached'}
      preview={`${projectName}: ${percentageUsed}% of budget used`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{projectName}</span> in{' '}
        {organizationName} has used{' '}
        <span style={text.strong}>{percentageUsed}%</span> of its time budget.
      </Text>
      <Section style={percentSection}>
        <Text style={{ ...text.large, color: accentColor }}>
          {percentageUsed}%
        </Text>
        <Text style={percentLabel}>budget used</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Hours used' value={hoursUsed} />
        <InfoRow label='Hours budgeted' value={hoursTotal} />
        <InfoRow label='Project' value={projectName} />
      </InfoCard>
      <ActionButton
        color={accentColor}
        href={`${baseUrl}/${orgSlug}/${projectSlug}/time-tracking`}
      >
        View Time Tracking
      </ActionButton>
    </EmailLayout>
  )
}

const percentSection = {
  textAlign: 'center' as const,
  padding: '20px 0 8px',
}

const percentLabel = {
  fontSize: '13px',
  color: '#71717a',
  fontWeight: '500' as const,
  margin: '4px 0 0',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
