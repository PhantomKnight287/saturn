import { Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface RequirementSignedEmailProps {
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  requirementId: string
  requirementTitle: string
  signedAt: string
  signerName: string
}

export default function RequirementSignedEmail({
  requirementTitle = 'Homepage Specifications v2',
  projectName = 'Website Redesign',
  signerName = 'Jane Smith',
  signedAt = 'March 8, 2026 at 2:30 PM',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  requirementId = 'req_abc123',
}: RequirementSignedEmailProps) {
  return (
    <EmailLayout
      accentColor='#16a34a'
      heading='Requirement signed'
      preview={`${signerName} signed "${requirementTitle}"`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{signerName}</span> has signed off on{' '}
        <span style={text.strong}>{requirementTitle}</span> for {projectName}.
      </Text>
      <InfoCard>
        <InfoRow label='Requirement' value={requirementTitle} />
        <InfoRow label='Signed at' value={signedAt} />
      </InfoCard>
      <ActionButton
        color='#16a34a'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/requirements/${requirementId}`}
      >
        View Requirement
      </ActionButton>
    </EmailLayout>
  )
}
