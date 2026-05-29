import type z from 'zod'
import type { InvoiceTimeUnit } from '@/lib/invoice-time-units'
import type {
  billingFrequencyEnum,
  expenses,
  invoiceRecipientEnum,
} from '@/server/db/schema'
import type { Role } from '@/types'
import type { Thread } from '../requirements/types'
import type { ProjectClient } from '../team/types'
import type { ProjectMember } from '../timesheets/types'
import type { invoiceFormSchema } from './common'

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>

export interface Invoice {
  currency: string
  dueDate: string | null
  id: string
  invoiceNumber: string
  recipient: (typeof invoiceRecipientEnum.enumValues)[number] | null
  recipients: ProjectClient[]
  status: 'draft' | 'sent' | 'paid' | 'disputed' | 'cancelled'
  totalAmount: string
  updatedAt: Date
}

export interface InvoicesClientProps {
  canCreate: boolean
  invoices: Invoice[]
  isClientInvolved?: boolean
  orgSlug: string
  projectSlug: string
  role: Role
}

export interface InvoiceCardProps {
  invoice: {
    id: string
    invoiceNumber: string
    status: 'draft' | 'sent' | 'paid' | 'disputed' | 'cancelled'
    totalAmount: string
    currency: string
    dueDate: string | null
    updatedAt: Date
    recipient: (typeof invoiceRecipientEnum.enumValues)[number] | null
    recipients: ProjectClient[]
  }
  isClientInvolved?: boolean
  orgSlug: string
  projectSlug: string
  role: Role
}

export interface MediaItem {
  contentType: string
  createdAt: Date
  id: string
  name: string
}

export interface ImageUploadProps {
  disabled?: boolean
  label: string
  /** Previously uploaded media for reuse */
  mediaItems?: MediaItem[]
  /** Receives the media item ID (not a URL) */
  onChange: (id: string | null) => void
  /** Max width/height for the preview */
  previewSize?: number
  projectId: string
  /** Media item ID (not a URL) */
  value: string | null
}

export interface InvoiceItem {
  amount: string
  description: string
  quantity: string
  unitPrice: string
}

export interface LinkedRequirement {
  requirementId: string
  slug: string
  status: string
  title: string
}

export interface InvoiceData {
  clientAddress: string | null
  clientCustomFields: CustomField[] | null
  clientName: string | null
  currency: string
  discountAmount: string | null
  discountLabel: string | null
  dueDate: string | null
  id: string
  invoiceNumber: string
  issueDate: string
  notes: string | null
  paymentTerms: string | null
  recipient: (typeof invoiceRecipientEnum.enumValues)[number] | null
  senderAddress: string | null
  senderCustomFields: CustomField[] | null
  senderLogo: string | null
  senderName: string | null
  senderSignature: string | null
  status: 'draft' | 'sent' | 'paid' | 'disputed' | 'cancelled'
  terms: string | null
  totalAmount: string
}

export interface BillableTimeEntry {
  date: string
  description: string
  durationMinutes: number
  id: string
  invoiceId: string | null
  memberId: string
  memberName: string | null
  requirementId: string | null
  requirementTitle: string | null
}

export interface InvoiceEditorProps {
  autoImportTime?: boolean
  billableEntries?: BillableTimeEntry[]
  canCreateThread?: boolean
  canDelete?: boolean
  canEdit?: boolean
  canMarkPaid?: boolean
  canResolveThread?: boolean
  canSend?: boolean
  capturedRates?: CapturedConversionRate[]
  clients: ProjectClient[]
  defaultClientAddress?: string | null
  defaultClientName?: string | null
  defaultCurrency?: string
  defaultSenderAddress?: string | null
  defaultSenderName?: string | null
  defaultTimeUnit?: InvoiceTimeUnit
  existingItems?: InvoiceItem[]
  existingRecipientIds?: string[]
  extendData?: ExtendInvoiceData
  invoice?: InvoiceData
  isClientInvolved?: boolean
  linkedRequirements?: LinkedRequirement[]
  mediaItems?: MediaItem[]
  member?: ProjectMember | null
  // Keyed by `memberRateKey(memberId, date)` — rates are effective-dated, so an
  // entry is priced with the rate in effect on its work date.
  memberRateMap?: Record<string, MemberRateMapEntry>
  mode: 'create' | 'edit'
  orgName: string
  orgSlug: string
  projectId: string
  projectName: string
  projectSlug: string
  recipientType: (typeof invoiceRecipientEnum.enumValues)[number]
  requirements: { id: string; title: string; slug: string }[]
  role: Role
  suggestedInvoiceNumber?: string
  threads?: Thread[]
  timesheetWarning?: string | null
  unbilledTimeEntries?: BillableTimeEntry[]
  unpaidExpenses?: InvoiceExpense[]
}

export interface CapturedConversionRate {
  capturedAt: Date | string
  fromCurrency: string
  rate: string
  toCurrency: string
}

export type InvoiceExpense = typeof expenses.$inferSelect & {
  // Pre-converted amount (in cents) in the invoice's currency.
  convertedAmountCents: number
  // Multiplier used for the conversion (target = source * rateUsed). 1 when
  // the source and invoice currencies match.
  rateUsed: number
}

export interface MemberRateMapEntry {
  currency: string
  // Hourly rate in the invoice's currency (already converted when available).
  hourlyRate: number
  originalCurrency?: string
  // The same hourly rate before currency conversion, so the UI can show the
  // original alongside the converted amount.
  originalHourlyRate?: number
  // What the member is actually paid (independent of what's billed to the client).
  pay?: {
    rate: number
    currency: string
    frequency: (typeof billingFrequencyEnum.enumValues)[number]
  }
  // Multiplier used for the conversion (target = source * rateUsed). 1 when
  // the source and invoice currencies match.
  rateUsed?: number
}

export interface CustomField {
  label: string
  value: string
}

export interface ExtendInvoiceData {
  clientAddress: string | null
  clientCustomFields: CustomField[]
  clientName: string | null
  currency: string
  items: InvoiceItem[]
  notes: string | null
  paymentTerms: string | null
  recipientMemberIds: string[]
  senderAddress: string | null
  senderCustomFields: CustomField[]
  senderLogo: string | null
  senderName: string | null
  senderSignature: string | null
  sourceInvoiceId: string
  sourceInvoiceNumber: string | null
  terms: string | null
}

export interface InvoicePDFPaymentInfo {
  accountName?: string
  accountNumber?: string
  bankName?: string
  iban?: string
  other?: string
  routingNumber?: string
  swiftCode?: string
}

export interface InvoicePDFData {
  clientAddress: string | null
  clientCustomFields: CustomField[]
  // Client (To) details
  clientName: string | null
  currency: string
  discountAmount?: string
  discountLabel?: string
  dueDate: string | null
  invoiceNumber: string
  issueDate: string
  items: {
    description: string
    quantity: string
    unitPrice: string
    amount: string
  }[]
  // Linked requirements
  linkedRequirements: { title: string; slug: string; status: string }[]
  notes: string | null
  orgName: string
  orgSlug: string
  // Payment information (optional — rendered as a section)
  paymentInfo?: InvoicePDFPaymentInfo
  // Additional
  paymentTerms: string | null
  projectName: string
  projectSlug: string
  recipients: ProjectClient[]
  senderAddress: string | null
  senderCustomFields: CustomField[]
  // Sender (From) details
  senderLogo: string | null
  senderName: string | null
  senderSignature: string | null
  taxAmount?: string
  // Tax & discount (optional — rendered in totals when provided)
  taxLabel?: string
  terms: string | null
  totalAmount: string
}
