import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface InvoicePaidEmailProps {
  currency: string
  invoiceId: string
  invoiceNumber: string
  orgSlug: string
  paidAt: string
  paidByName: string
  projectName: string
  projectSlug: string
  recipientName: string
  totalAmount: string
}

export default function InvoicePaidEmail({
  recipientName = 'John Doe',
  invoiceNumber = 'INV-2026-001',
  projectName = 'Website Redesign',
  paidByName = 'Jane Smith',
  totalAmount = '2,500.00',
  currency = 'USD',
  paidAt = 'March 10, 2026 at 3:45 PM',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  invoiceId = 'inv_abc123',
}: InvoicePaidEmailProps) {
  return (
    <EmailLayout
      accentColor='#16a34a'
      heading='Invoice paid'
      preview={`Invoice ${invoiceNumber} marked as paid — ${currency} ${totalAmount}`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{paidByName}</span> marked invoice{' '}
        <span style={text.strong}>{invoiceNumber}</span> as paid for{' '}
        {projectName}.
      </Text>
      <Section style={amountSection}>
        <Text style={currencyLabel}>{currency}</Text>
        <Text style={{ ...text.large, color: '#16a34a' }}>{totalAmount}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Invoice' value={invoiceNumber} />
        <InfoRow label='Paid at' value={paidAt} />
      </InfoCard>
      <ActionButton
        color='#16a34a'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/invoices/${invoiceId}`}
      >
        View Invoice
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
