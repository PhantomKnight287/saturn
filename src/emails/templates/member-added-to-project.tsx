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

interface MemberAddedToProjectEmailProps {
  addedByName: string
  dueDate?: string
  memberName: string
  organizationName: string
  orgSlug: string
  projectDescription?: string
  projectName: string
  projectSlug: string
}

export default function MemberAddedToProjectEmail({
  memberName = 'Jane Smith',
  projectName = 'Website Redesign',
  organizationName = 'Acme Studio',
  addedByName = 'John Doe',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  projectDescription = 'Complete overhaul of the company website with new branding.',
  dueDate = 'April 15, 2026',
}: MemberAddedToProjectEmailProps) {
  return (
    <EmailLayout
      heading="You've been added to a project"
      preview={`You've been added to ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {memberName}, <span style={text.strong}>{addedByName}</span> added
        you to <span style={text.strong}>{projectName}</span> in{' '}
        {organizationName}.
      </Text>
      <InfoCard>
        <InfoRow label='Project' value={projectName} />
        {dueDate && <InfoRow label='Due' value={dueDate} />}
      </InfoCard>
      {projectDescription && (
        <Text style={{ ...text.muted, margin: '0 0 8px' }}>
          {projectDescription}
        </Text>
      )}
      <ActionButton href={`${baseUrl}/${orgSlug}/${projectSlug}`}>
        Open Project
      </ActionButton>
    </EmailLayout>
  )
}
