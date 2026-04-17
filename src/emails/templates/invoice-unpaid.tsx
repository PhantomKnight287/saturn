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

interface InvoiceUnpaidEmailProps {
  currency: string
  invoiceId: string
  invoiceNumber: string
  markedByName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  totalAmount: string
}

export default function InvoiceUnpaidEmail({
  invoiceNumber = 'INV-2026-001',
  projectName = 'Website Redesign',
  markedByName = 'Jane Smith',
  totalAmount = '2,500.00',
  currency = 'USD',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  invoiceId = 'inv_abc123',
}: InvoiceUnpaidEmailProps) {
  return (
    <EmailLayout
      accentColor='#f59e0b'
      heading='Invoice marked as unpaid'
      preview={`Invoice ${invoiceNumber} has been marked as unpaid — ${currency} ${totalAmount}`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{markedByName}</span> marked invoice{' '}
        <span style={text.strong}>{invoiceNumber}</span> as unpaid for{' '}
        {projectName}. Payment is still required.
      </Text>
      <Section style={amountSection}>
        <Text style={currencyLabel}>{currency}</Text>
        <Text style={{ ...text.large, color: '#f59e0b' }}>{totalAmount}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Invoice' value={invoiceNumber} />
        <InfoRow label='Status' value='Pending payment' />
      </InfoCard>
      <ActionButton
        color='#f59e0b'
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
