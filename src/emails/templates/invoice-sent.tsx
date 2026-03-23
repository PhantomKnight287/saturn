import { Section, Text } from '@react-email/components'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface InvoiceSentEmailProps {
  currency: string
  dueDate: string
  invoiceId: string
  invoiceNumber: string
  issueDate: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  senderName: string
  totalAmount: string
}

export default function InvoiceSentEmail({
  recipientName = 'Jane Smith',
  invoiceNumber = 'INV-2026-001',
  projectName = 'Website Redesign',
  senderName = 'John Doe',
  totalAmount = '2,500.00',
  currency = 'USD',
  dueDate = 'March 30, 2026',
  issueDate = 'March 8, 2026',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  invoiceId = 'inv_abc123',
}: InvoiceSentEmailProps) {
  return (
    <EmailLayout
      accentColor='#7c3aed'
      heading='You have a new invoice'
      preview={`Invoice ${invoiceNumber} — ${currency} ${totalAmount}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{senderName}</span> sent
        you an invoice for work on{' '}
        <span style={text.strong}>{projectName}</span>.
      </Text>
      <Section style={amountSection}>
        <Text style={currencyLabel}>{currency}</Text>
        <Text style={{ ...text.large, color: '#18181b' }}>{totalAmount}</Text>
      </Section>
      <InfoCard>
        <InfoRow label='Invoice' value={invoiceNumber} />
        <InfoRow label='Issued' value={issueDate} />
        <InfoRow label='Due' value={dueDate} />
      </InfoCard>
      <ActionButton
        href={`${baseUrl}/${orgSlug}/${projectSlug}/invoices/${invoiceId}`}
      >
        View Invoice
      </ActionButton>
      <Text style={text.muted}>
        If you have questions about this invoice, you can start a thread
        directly on the invoice page.
      </Text>
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
