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

interface ProposalChangeResolvedEmailProps {
  orgSlug: string
  proposalSlug: string
  proposalTitle: string
  recipientName: string
  resolution: 'accepted' | 'rejected'
  resolverName: string
}

export default function ProposalChangeResolvedEmail({
  recipientName = 'Jane Smith',
  proposalTitle = 'E-Commerce Platform Rebuild',
  resolverName = 'John Doe',
  resolution = 'accepted',
  orgSlug = 'acme',
  proposalSlug = 'ecommerce-rebuild',
}: ProposalChangeResolvedEmailProps) {
  const isAccepted = resolution === 'accepted'
  const accentColor = isAccepted ? '#16a34a' : '#71717a'

  return (
    <EmailLayout
      accentColor={accentColor}
      heading={`Change request ${resolution}`}
      preview={`Your change request on "${proposalTitle}" was ${resolution}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{resolverName}</span>{' '}
        {isAccepted ? 'accepted' : 'rejected'} your change request on the
        proposal <span style={text.strong}>{proposalTitle}</span>.
      </Text>
      <InfoCard>
        <InfoRow label='Proposal' value={proposalTitle} />
        <InfoRow label='Resolved by' value={resolverName} />
      </InfoCard>
      <Text style={text.muted}>
        {isAccepted
          ? 'The proposal has been updated. You may receive a new version for review.'
          : 'The team has decided not to incorporate this change. You can view the proposal for more details.'}
      </Text>
      <ActionButton
        color={accentColor}
        href={`${baseUrl}/${orgSlug}/proposals/${proposalSlug}`}
      >
        View Proposal
      </ActionButton>
    </EmailLayout>
  )
}
