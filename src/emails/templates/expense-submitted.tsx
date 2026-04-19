import { Section, Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  Badge,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface ExpenseSubmittedEmailProps {
  amount: string
  billable: boolean
  category: string
  expenseDate: string
  memberName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  title: string
}

export default function ExpenseSubmittedEmail({
  recipientName = 'John Doe',
  memberName = 'Jane Smith',
  projectName = 'Website Redesign',
  title = 'Adobe Creative Cloud monthly subscription',
  amount = '$49.99',
  category = 'Software',
  expenseDate = 'Mar 10, 2026',
  billable = true,
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: ExpenseSubmittedEmailProps) {
  return (
    <EmailLayout
      accentColor='#7c3aed'
      heading='Expense submitted for review'
      preview={`${memberName} submitted a ${amount} expense for review — ${projectName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{memberName}</span>{' '}
        submitted an expense for <span style={text.strong}>{projectName}</span>{' '}
        that needs your approval.
      </Text>
      <Section style={amountSection}>
        <Text style={amountLabel}>Amount</Text>
        <Text style={{ ...text.large, color: '#7c3aed' }}>{amount}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Member' value={memberName} />
        <InfoRow label='Title' value={title} />
        <InfoRow label='Category' value={category} />
        <InfoRow label='Date' value={expenseDate} />
        <InfoRow
          label='Billable'
          value={
            <Badge color={billable ? '#16a34a' : '#71717a'}>
              {billable ? 'Yes' : 'No'}
            </Badge>
          }
        />
      </InfoCard>
      <ActionButton href={`${baseUrl}/${orgSlug}/${projectSlug}/expenses`}>
        Review Expense
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
