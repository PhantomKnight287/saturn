import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface ProposalExpiringSoonEmailProps {
  clientNames: string
  daysRemaining: number
  organizationName: string
  orgSlug: string
  proposalSlug: string
  proposalTitle: string
  recipientName: string
  validUntil: string
}

export default function ProposalExpiringSoonEmail({
  recipientName = 'John Doe',
  proposalTitle = 'E-Commerce Platform Rebuild',
  organizationName = 'Acme Studio',
  validUntil = 'April 15, 2026',
  daysRemaining = 3,
  clientNames = 'Jane Smith, Bob Wilson',
  orgSlug = 'acme',
  proposalSlug = 'ecommerce-rebuild',
}: ProposalExpiringSoonEmailProps) {
  const isExpired = daysRemaining <= 0
  const accentColor = isExpired ? '#ef4444' : '#f59e0b'

  return (
    <EmailLayout
      accentColor={accentColor}
      heading={isExpired ? 'Proposal has expired' : 'Proposal expiring soon'}
      preview={`${proposalTitle}: ${isExpired ? 'expired' : `expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, your proposal{' '}
        <span style={text.strong}>{proposalTitle}</span>{' '}
        {isExpired
          ? 'has expired without being approved.'
          : `expires on ${validUntil} and has not been approved yet.`}
      </Text>
      <Section style={countdownSection}>
        <Text style={{ ...text.large, color: accentColor }}>
          {isExpired ? 0 : daysRemaining}
        </Text>
        <Text style={countdownLabel}>
          {isExpired
            ? 'expired'
            : `day${daysRemaining === 1 ? '' : 's'} remaining`}
        </Text>
      </Section>
      <InfoCard>
        <InfoRow label='Proposal' value={proposalTitle} />
        <InfoRow label='Sent to' value={clientNames} />
        <InfoRow label='Expires' value={validUntil} />
      </InfoCard>
      <ActionButton
        color={accentColor}
        href={`${baseUrl}/${orgSlug}/proposals/${proposalSlug}`}
      >
        View Proposal
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
