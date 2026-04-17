import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  InfoCard,
  InfoRow,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface InvoiceDisputedEmailProps {
  currency: string
  disputedByName: string
  invoiceId: string
  invoiceNumber: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  totalAmount: string
}

export default function InvoiceDisputedEmail({
  invoiceNumber = 'INV-2026-001',
  projectName = 'Website Redesign',
  disputedByName = 'Jane Smith',
  totalAmount = '2,500.00',
  currency = 'USD',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
  invoiceId = 'inv_abc123',
}: InvoiceDisputedEmailProps) {
  return (
    <EmailLayout
      accentColor='#ef4444'
      heading='Invoice needs attention'
      preview={`${disputedByName} raised a question about invoice ${invoiceNumber}`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{disputedByName}</span> started a discussion
        on invoice <span style={text.strong}>{invoiceNumber}</span> for{' '}
        {projectName}.
      </Text>
      <InfoCard>
        <InfoRow label='Invoice' value={invoiceNumber} />
        <InfoRow label='Amount' value={`${currency} ${totalAmount}`} />
      </InfoCard>
      <Text style={text.muted}>
        Check the invoice thread to address any questions and resolve the
        dispute.
      </Text>
      <ActionButton
        color='#ef4444'
        href={`${baseUrl}/${orgSlug}/${projectSlug}/invoices/${invoiceId}`}
      >
        View Discussion
      </ActionButton>
    </EmailLayout>
  )
}
