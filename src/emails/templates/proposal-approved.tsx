import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface ProposalApprovedEmailProps {
  clientName: string
  currency: string
  orgSlug: string
  proposalSlug: string
  proposalTitle: string
  recipientName: string
  totalAmount: string | null
}

export default function ProposalApprovedEmail({
  recipientName = 'John Doe',
  proposalTitle = 'E-Commerce Platform Rebuild',
  clientName = 'Jane Smith',
  totalAmount = '15,000.00',
  currency = 'USD',
  orgSlug = 'acme',
  proposalSlug = 'ecommerce-rebuild',
}: ProposalApprovedEmailProps) {
  return (
    <EmailLayout
      accentColor='#16a34a'
      heading='Proposal approved'
      preview={`Proposal approved: ${proposalTitle}`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{clientName}</span> approved the proposal{' '}
        <span style={text.strong}>{proposalTitle}</span>.
      </Text>
      {totalAmount && (
        <Section style={amountSection}>
          <Text style={currencyLabel}>{currency}</Text>
          <Text style={{ ...text.large, color: '#16a34a' }}>{totalAmount}</Text>
        </Section>
      )}
      <InfoCard>
        <InfoRow label='Proposal' value={proposalTitle} />
        <InfoRow label='Approved by' value={clientName} />
      </InfoCard>
      <Text style={text.muted}>
        You can now scaffold a project from this approved proposal.
      </Text>
      <ActionButton
        color='#16a34a'
        href={`${baseUrl}/${orgSlug}/proposals/${proposalSlug}`}
      >
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
