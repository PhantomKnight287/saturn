import { Section, Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface ExpenseSentToClientEmailProps {
  currency: string
  expenseCount: number
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  senderName: string
  totalAmount: string
}

export default function ExpenseSentToClientEmail({
  recipientName = 'Client',
  senderName = 'John Doe',
  projectName = 'Website Redesign',
  expenseCount = 3,
  totalAmount = '$149.97',
  currency = 'USD',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: ExpenseSentToClientEmailProps) {
  return (
    <EmailLayout
      accentColor='#2563eb'
      heading='Expenses for review'
      preview={`${expenseCount} expense${expenseCount === 1 ? '' : 's'} sent for your review — ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{senderName}</span> sent
        you {expenseCount} expense{expenseCount === 1 ? '' : 's'} for{' '}
        <span style={text.strong}>{projectName}</span> to review.
      </Text>
      <Section style={amountSection}>
        <Text style={amountLabel}>Total amount</Text>
        <Text style={{ ...text.large, color: '#2563eb' }}>{totalAmount}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Project' value={projectName} />
        <InfoRow
          label='Expenses'
          value={`${expenseCount} item${expenseCount === 1 ? '' : 's'}`}
        />
        <InfoRow label='Currency' value={currency} />
      </InfoCard>
      <ActionButton
        color='#2563eb'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/expenses`}
      >
        Review Expenses
      </ActionButton>
    </EmailLayout>
  )
}

const amountSection = {
  textAlign: 'center' as const,
  padding: '20px 0 8px',
}

const amountLabel = {
  fontSize: '13px',
  color: '#71717a',
  fontWeight: '500' as const,
  margin: '0 0 4px',
  textAlign: 'center' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
