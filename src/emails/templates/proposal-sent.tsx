import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface ProposalSentEmailProps {
  currency: string
  organizationName: string
  orgSlug: string
  pricingType: string
  proposalSlug: string
  proposalTitle: string
  recipientName: string
  senderName: string
  totalAmount: string | null
  validUntil: string | null
}

export default function ProposalSentEmail({
  recipientName = 'Jane Smith',
  proposalTitle = 'E-Commerce Platform Rebuild',
  organizationName = 'Acme Studio',
  senderName = 'John Doe',
  totalAmount = '15,000.00',
  currency = 'USD',
  pricingType = 'fixed',
  validUntil = 'April 15, 2026',
  orgSlug = 'acme',
  proposalSlug = 'ecommerce-rebuild',
}: ProposalSentEmailProps) {
  return (
    <EmailLayout
      accentColor='#7c3aed'
      heading='You have a new proposal'
      preview={`New proposal from ${organizationName}: ${proposalTitle}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{senderName}</span> from{' '}
        <span style={text.strong}>{organizationName}</span> sent you a proposal
        for your review.
      </Text>
      {totalAmount && (
        <Section style={amountSection}>
          <Text style={currencyLabel}>{currency}</Text>
          <Text style={{ ...text.large, color: '#18181b' }}>{totalAmount}</Text>
        </Section>
      )}
      <InfoCard>
        <InfoRow label='Proposal' value={proposalTitle} />
        <InfoRow
          label='Pricing'
          value={pricingType.charAt(0).toUpperCase() + pricingType.slice(1)}
        />
        {validUntil && <InfoRow label='Valid until' value={validUntil} />}
      </InfoCard>
      <Text style={text.muted}>
        Review the proposal details and approve it, or request changes if
        anything needs adjustment.
      </Text>
      <ActionButton href={`${baseUrl}/${orgSlug}/proposals/${proposalSlug}`}>
        View Proposal
      </ActionButton>
    </EmailLayout>
  )
}

const amountSection = {
  textAlign: 'center' as const,
  padding: '20px 0 8px',
}

const currencyLabel = {
  fontSize: '13px',
  color: '#71717a',
  fontWeight: '500' as const,
  margin: '0 0 4px',
  textAlign: 'center' as const,
}
