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

interface ProjectDueDateReminderEmailProps {
  daysRemaining: number
  dueDate: string
  organizationName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
}

export default function ProjectDueDateReminderEmail({
  recipientName = 'John Doe',
  projectName = 'Website Redesign',
  organizationName = 'Acme Studio',
  dueDate = 'March 15, 2026',
  daysRemaining = 3,
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: ProjectDueDateReminderEmailProps) {
  const isOverdue = daysRemaining < 0
  const absDays = Math.abs(daysRemaining)
  const accentColor = isOverdue ? '#ef4444' : '#f59e0b'

  const countdownText = isOverdue
    ? `${absDays} day${absDays === 1 ? '' : 's'} overdue`
    : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`

  return (
    <EmailLayout
      accentColor={accentColor}
      heading={isOverdue ? 'Project is overdue' : 'Due date approaching'}
      preview={`${projectName}: ${countdownText}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{projectName}</span> in{' '}
        {organizationName} {isOverdue ? 'was' : 'is'} due on{' '}
        <span style={text.strong}>{dueDate}</span>.
      </Text>
      <Section style={countdownSection}>
        <Text style={{ ...text.large, color: accentColor }}>{absDays}</Text>
        <Text style={countdownLabel}>
          {isOverdue
            ? `day${absDays === 1 ? '' : 's'} overdue`
            : `day${daysRemaining === 1 ? '' : 's'} remaining`}
        </Text>
      </Section>
      <InfoCard>
        <InfoRow label='Project' value={projectName} />
        <InfoRow label='Due date' value={dueDate} />
        <InfoRow label='Workspace' value={organizationName} />
      </InfoCard>
      <ActionButton
        color={accentColor}
        href={`${baseUrl}/${orgSlug}/${projectSlug}`}
      >
        View Project
      </ActionButton>
    </EmailLayout>
  )
}

const countdownSection = {
  textAlign: 'center' as const,
  padding: '16px 0 8px',
}

const countdownLabel = {
  fontSize: '13px',
  color: '#71717a',
  fontWeight: '500' as const,
  margin: '4px 0 0',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
