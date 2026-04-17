import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  QuoteBlock,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface ProposalChangesRequestedEmailProps {
  description: string
  orgSlug: string
  proposalSlug: string
  proposalTitle: string
  recipientName: string
  requesterName: string
}

export default function ProposalChangesRequestedEmail({
  proposalTitle = 'E-Commerce Platform Rebuild',
  requesterName = 'Jane Smith',
  description = 'The milestone pricing for phase 2 seems higher than we discussed. Can we revisit the scope breakdown for the payment integration module?',
  orgSlug = 'acme',
  proposalSlug = 'ecommerce-rebuild',
}: ProposalChangesRequestedEmailProps) {
  return (
    <EmailLayout
      accentColor='#f59e0b'
      heading='Changes requested on proposal'
      preview={`${requesterName} requested changes on "${proposalTitle}"`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{requesterName}</span> reviewed your proposal{' '}
        <span style={text.strong}>{proposalTitle}</span> and is requesting
        changes before approving.
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
        href={`${baseUrl}/${orgSlug}/proposals/${proposalSlug}`}
      >
        View Change Request
      </ActionButton>
    </EmailLayout>
  )
}
