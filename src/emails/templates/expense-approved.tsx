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

interface ExpenseApprovedEmailProps {
  amount: string
  approverName: string
  billable: boolean
  category: string
  expenseDate: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  title: string
}

export default function ExpenseApprovedEmail({
  recipientName = 'Jane Smith',
  approverName = 'John Doe',
  projectName = 'Website Redesign',
  title = 'Adobe Creative Cloud monthly subscription',
  amount = '$49.99',
  category = 'Software',
  expenseDate = 'Mar 10, 2026',
  billable = true,
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: ExpenseApprovedEmailProps) {
  return (
    <EmailLayout
      accentColor='#16a34a'
      heading='Expense approved'
      preview={`Your expense for ${projectName} has been approved`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{approverName}</span>{' '}
        approved your expense for <span style={text.strong}>{projectName}</span>
        .
      </Text>
      <Section style={amountSection}>
        <Text style={amountLabel}>Approved amount</Text>
        <Text style={{ ...text.large, color: '#16a34a' }}>{amount}</Text>
      </Section>
      <InfoCard>
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
      <ActionButton
        color='#16a34a'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/expenses`}
      >
        View Expense
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
