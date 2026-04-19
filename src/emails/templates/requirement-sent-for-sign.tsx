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

interface RequirementSentForSignEmailProps {
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  requirementId: string
  requirementTitle: string
  senderName: string
}

export default function RequirementSentForSignEmail({
  recipientName = 'Jane Smith',
  requirementTitle = 'Homepage Specifications v2',
  projectName = 'Website Redesign',
  senderName = 'John Doe',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  requirementId = 'req_abc123',
}: RequirementSentForSignEmailProps) {
  return (
    <EmailLayout
      accentColor='#7c3aed'
      heading='Requirement awaiting your sign-off'
      preview={`Action needed: Sign "${requirementTitle}" for ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{senderName}</span> sent
        you a requirement to review and sign for{' '}
        <span style={text.strong}>{projectName}</span>.
      </Text>
      <InfoCard>
        <InfoRow label='Requirement' value={requirementTitle} />
        <InfoRow label='Project' value={projectName} />
      </InfoCard>
      <Text style={text.muted}>
        You can sign the requirement or highlight specific text to start a
        discussion thread.
      </Text>
      <ActionButton
        href={`${baseUrl}/${orgSlug}/${projectSlug}/requirements/${requirementId}`}
      >
        Review & Sign
      </ActionButton>
    </EmailLayout>
  )
}
