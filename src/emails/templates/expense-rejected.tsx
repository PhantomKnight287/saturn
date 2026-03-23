import { Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  QuoteBlock,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface ExpenseRejectedEmailProps {
  amount: string
  category: string
  expenseDate: string
  orgSlug: string
  projectName: string
  projectSlug: string
  reason: string
  recipientName: string
  rejectorName: string
  title: string
}

export default function ExpenseRejectedEmail({
  recipientName = 'Jane Smith',
  rejectorName = 'John Doe',
  projectName = 'Website Redesign',
  title = 'Adobe Creative Cloud monthly subscription',
  amount = '$49.99',
  category = 'Software',
  expenseDate = 'Mar 10, 2026',
  reason = 'This subscription is already covered by the company account. Please use the shared login instead.',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: ExpenseRejectedEmailProps) {
  return (
    <EmailLayout
      accentColor='#ef4444'
      heading='Expense rejected'
      preview={`Your expense for ${projectName} was rejected`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{rejectorName}</span>{' '}
        reviewed your {amount} expense for{' '}
        <span style={text.strong}>{projectName}</span> and is requesting
        changes.
      </Text>
      <QuoteBlock borderColor='#ef4444'>
        <Text
          style={{
            fontSize: '14px',
            color: '#3f3f46',
            lineHeight: '22px',
            margin: '0',
            fontStyle: 'italic',
          }}
        >
          "{reason}"
        </Text>
      </QuoteBlock>
      <InfoCard>
        <InfoRow label='Title' value={title} />
        <InfoRow label='Category' value={category} />
        <InfoRow label='Amount' value={amount} />
        <InfoRow label='Date' value={expenseDate} />
      </InfoCard>
      <Text style={text.muted}>
        You can edit the expense and resubmit for approval.
      </Text>
      <ActionButton
        color='#ef4444'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/expenses`}
      >
        Edit & Resubmit
      </ActionButton>
    </EmailLayout>
  )
}
