import { Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  QuoteBlock,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface RequirementChangeRequestedEmailProps {
  description: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  requesterName: string
  requirementId: string
  requirementTitle: string
}

export default function RequirementChangeRequestedEmail({
  recipientName = 'John Doe',
  requirementTitle = 'Homepage Specifications v2',
  projectName = 'Website Redesign',
  requesterName = 'Jane Smith',
  description = 'The hero section copy needs to be updated to match the new brand guidelines we discussed last week. Also, the mobile breakpoints section is missing the tablet layout specs.',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  requirementId = 'req_abc123',
}: RequirementChangeRequestedEmailProps) {
  return (
    <EmailLayout
      accentColor='#f59e0b'
      heading='Changes requested'
      preview={`${requesterName} requested changes on "${requirementTitle}"`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{requesterName}</span> reviewed{' '}
        <span style={text.strong}>{requirementTitle}</span> for {projectName}{' '}
        and is requesting changes before signing off.
      </Text>
      <QuoteBlock borderColor='#f59e0b'>
        <Text
          style={{
            fontSize: '14px',
            color: '#3f3f46',
            lineHeight: '22px',
            margin: '0',
            fontStyle: 'italic',
          }}
        >
          "{description}"
        </Text>
      </QuoteBlock>
      <ActionButton
        color='#f59e0b'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/requirements/${requirementId}`}
      >
        View Change Request
      </ActionButton>
    </EmailLayout>
  )
}
