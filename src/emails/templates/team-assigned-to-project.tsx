import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface TeamAssignedToProjectEmailProps {
  assignedByName: string
  organizationName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  teamName: string
}

export default function TeamAssignedToProjectEmail({
  recipientName = 'Jane Smith',
  teamName = 'Design Team',
  projectName = 'Website Redesign',
  organizationName = 'Acme Studio',
  assignedByName = 'John Doe',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: TeamAssignedToProjectEmailProps) {
  return (
    <EmailLayout
      heading="Your team's on a new project"
      preview={`Your team "${teamName}" has been assigned to ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{assignedByName}</span>{' '}
        assigned your team <span style={text.strong}>{teamName}</span> to{' '}
        <span style={text.strong}>{projectName}</span> in {organizationName}.
      </Text>
      <InfoCard>
        <InfoRow label='Team' value={teamName} />
        <InfoRow label='Project' value={projectName} />
      </InfoCard>
      <ActionButton href={`${baseUrl}/${orgSlug}/${projectSlug}`}>
        Open Project
      </ActionButton>
    </EmailLayout>
  )
}
