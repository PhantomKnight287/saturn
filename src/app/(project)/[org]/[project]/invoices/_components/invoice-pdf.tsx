/** biome-ignore-all lint/performance/useTopLevelRegex: No idea what this lint rule does */
import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { currencies } from '@/data/currencies'
import type { InvoicePDFData } from '../types'

// ── Palette ──
const INK = '#1e1b4b'
const ACCENT = '#4f46e5'
const ACCENT_LIGHT = '#eef2ff'
const MUTED = '#6b7280'
const FAINT = '#d1d5db'
const HAIRLINE = '#e5e7eb'
const TEXT = '#374151'
const TEXT_DARK = '#1f2937'
const TEXT_MID = '#4b5563'

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 64,
    paddingHorizontal: 0,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: TEXT,
  },

  // ── Top accent bar ──
  accentBar: {
    height: 6,
    backgroundColor: ACCENT,
  },

  body: {
    paddingHorizontal: 48,
    paddingTop: 32,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  senderBlock: {
    maxWidth: 240,
  },
  logo: {
    width: 40,
    height: 40,
    objectFit: 'contain',
    marginBottom: 10,
  },
  senderName: {
    fontSize: 14,
    fontWeight: 700,
    color: INK,
    marginBottom: 3,
  },
  senderDetail: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.6,
  },
  titleBlock: {
    alignItems: 'flex-end',
  },
  titleText: {
    fontSize: 32,
    fontWeight: 700,
    color: INK,
    letterSpacing: -1,
  },
  invoiceNum: {
    fontSize: 10,
    color: ACCENT,
    fontWeight: 600,
    marginTop: 2,
  },

  // ── Details + Bill To ──
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  detailsCol: {
    width: '48%',
  },
  label: {
    fontSize: 7.5,
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 700,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailKey: {
    fontSize: 9,
    color: MUTED,
    width: 90,
  },
  detailVal: {
    fontSize: 9,
    color: TEXT_DARK,
    fontWeight: 600,
    flex: 1,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 700,
    color: INK,
    marginBottom: 3,
  },
  clientText: {
    fontSize: 9,
    color: TEXT_MID,
    lineHeight: 1.6,
  },
  kvRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  kvLabel: {
    fontSize: 8.5,
    color: MUTED,
    width: 80,
  },
  kvValue: {
    fontSize: 8.5,
    color: TEXT_DARK,
    flex: 1,
  },

  // ── Items table ──
  table: {
    marginBottom: 0,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  th: {
    fontSize: 7.5,
    color: ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 700,
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  td: {
    fontSize: 9.5,
    color: TEXT,
  },
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: 'right' as const },
  colPrice: { width: 88, textAlign: 'right' as const },
  colAmt: { width: 88, textAlign: 'right' as const },

  // ── Totals ──
  totalsWrap: {
    alignItems: 'flex-end',
    marginTop: 6,
    paddingRight: 12,
  },
  subtotalRow: {
    flexDirection: 'row',
    width: 210,
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  subtotalLabel: {
    fontSize: 9,
    color: MUTED,
  },
  subtotalVal: {
    fontSize: 9,
    color: TEXT,
    fontWeight: 600,
  },
  totalRow: {
    flexDirection: 'row',
    width: 210,
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 2,
    borderTopWidth: 2,
    borderTopColor: INK,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: INK,
  },
  totalVal: {
    fontSize: 12,
    fontWeight: 700,
    color: ACCENT,
  },

  // ── Requirements ──
  reqSection: {
    marginTop: 22,
  },
  reqItem: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 10,
  },
  reqBullet: {
    fontSize: 9,
    color: TEXT_MID,
    width: 10,
  },
  reqLink: {
    fontSize: 9,
    color: ACCENT,
    textDecoration: 'underline',
  },

  // ── Payment info ──
  paymentSection: {
    marginTop: 22,
    padding: 14,
    backgroundColor: ACCENT_LIGHT,
    borderRadius: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  paymentKey: {
    fontSize: 8.5,
    color: ACCENT,
    fontWeight: 600,
    width: 100,
  },
  paymentVal: {
    fontSize: 8.5,
    color: INK,
    flex: 1,
    fontFamily: 'Courier',
  },

  // ── Notes / Terms ──
  noteBlock: {
    marginTop: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: FAINT,
  },
  noteLabel: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 700,
    marginBottom: 5,
  },
  noteText: {
    fontSize: 9,
    color: TEXT_MID,
    lineHeight: 1.6,
  },

  // ── Signature ──
  sigBlock: {
    marginTop: 36,
    alignItems: 'flex-end',
  },
  sigLabel: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  sigImg: {
    width: 130,
    height: 46,
    objectFit: 'contain',
  },
  sigLine: {
    width: 130,
    borderTopWidth: 1,
    borderTopColor: FAINT,
    marginTop: 6,
    paddingTop: 5,
  },
  sigName: {
    fontSize: 8.5,
    color: TEXT_MID,
    textAlign: 'center',
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    fontSize: 7,
    color: FAINT,
  },
  footerLink: {
    fontSize: 7,
    color: FAINT,
    textDecoration: 'none',
  },
})

// ── Helpers ──

function getCurrencySymbol(cc: string): string {
  const found = currencies.find((c) => c.cc === cc)
  return found?.value ?? cc
}

function formatAmount(amount: string | number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode)
  const num = Number(amount)
  const formatted =
    num % 1 === 0
      ? num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : num.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })
  return `${symbol} ${formatted}`
}

// ── Component ──

export default function InvoicePDF({ data }: { data: InvoicePDFData }) {
  const fromName = data.senderName || data.orgName
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  const projectUrl = `${baseUrl}/${data.orgSlug}/${data.projectSlug}`

  // Compute totals
  const subtotal = data.items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )
  const tax = data.taxAmount ? Number(data.taxAmount) : 0
  const discount = data.discountAmount ? Number(data.discountAmount) : 0
  const hasAdjustments = tax > 0 || discount > 0
  const grandTotal = subtotal + tax - discount

  // Payment info entries
  const paymentEntries: { label: string; value: string }[] = []
  if (data.paymentInfo) {
    const pi = data.paymentInfo
    if (pi.bankName) {
      paymentEntries.push({ label: 'Bank', value: pi.bankName })
    }
    if (pi.accountName) {
      paymentEntries.push({ label: 'Account Name', value: pi.accountName })
    }
    if (pi.accountNumber) {
      paymentEntries.push({ label: 'Account No.', value: pi.accountNumber })
    }
    if (pi.routingNumber) {
      paymentEntries.push({ label: 'Routing No.', value: pi.routingNumber })
    }
    if (pi.swiftCode) {
      paymentEntries.push({ label: 'SWIFT/BIC', value: pi.swiftCode })
    }
    if (pi.iban) {
      paymentEntries.push({ label: 'IBAN', value: pi.iban })
    }
    if (pi.other) {
      paymentEntries.push({ label: 'Other', value: pi.other })
    }
  }

  return (
    <Document>
      <Page size='A4' style={s.page}>
        {/* Accent strip */}
        <View style={s.accentBar} />

        <View style={s.body}>
          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.senderBlock}>
              {data.senderLogo && (
                <Image
                  src={`${baseUrl}/api/files/${data.senderLogo}`}
                  style={s.logo}
                />
              )}
              <Text style={s.senderName}>{fromName}</Text>
              {data.senderAddress && (
                <Text style={s.senderDetail}>{data.senderAddress}</Text>
              )}
              {data.senderCustomFields.map((f, i) => (
                <Text key={i} style={s.senderDetail}>
                  {f.label}: {f.value}
                </Text>
              ))}
            </View>

            <View style={s.titleBlock}>
              <Text style={s.titleText}>INVOICE</Text>
              <Text style={s.invoiceNum}>{data.invoiceNumber}</Text>
            </View>
          </View>

          {/* ── Invoice details + Bill To ── */}
          <View style={s.middleRow}>
            <View style={s.detailsCol}>
              <Text style={s.label}>Invoice Details</Text>
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Issue Date</Text>
                <Text style={s.detailVal}>{data.issueDate}</Text>
              </View>
              {data.dueDate && (
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Due Date</Text>
                  <Text style={s.detailVal}>{data.dueDate}</Text>
                </View>
              )}
              {data.paymentTerms && (
                <View style={s.detailRow}>
                  <Text style={s.detailKey}>Payment Terms</Text>
                  <Text style={s.detailVal}>{data.paymentTerms}</Text>
                </View>
              )}
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Currency</Text>
                <Text style={s.detailVal}>
                  {data.currency} ({getCurrencySymbol(data.currency)})
                </Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailKey}>Project</Text>
                <Text style={s.detailVal}>{data.projectName}</Text>
              </View>
            </View>

            <View style={s.detailsCol}>
              <Text style={s.label}>Bill To</Text>
              {data.clientName ? (
                <Text style={s.clientName}>{data.clientName}</Text>
              ) : (
                data.recipients.map((r, i) => (
                  <Text key={i} style={s.clientName}>
                    {r.userName || r.userEmail}
                  </Text>
                ))
              )}
              {data.clientAddress && (
                <Text style={s.clientText}>{data.clientAddress}</Text>
              )}
              {data.clientCustomFields.map((f, i) => (
                <View key={i} style={s.kvRow}>
                  <Text style={s.kvLabel}>{f.label}:</Text>
                  <Text style={s.kvValue}>{f.value}</Text>
                </View>
              ))}
              {data.clientName && data.recipients.length > 0 && (
                <Text
                  style={{
                    ...s.clientText,
                    marginTop: 6,
                    fontSize: 8,
                    color: MUTED,
                  }}
                >
                  c/o{' '}
                  {data.recipients
                    .map((r) => r.userName || r.userEmail)
                    .join(', ')}
                </Text>
              )}
            </View>
          </View>

          {/* ── Items table ── */}
          <View style={s.table}>
            <View style={s.tableHead}>
              <Text style={{ ...s.th, ...s.colDesc }}>Description</Text>
              <Text style={{ ...s.th, ...s.colQty }}>Qty</Text>
              <Text style={{ ...s.th, ...s.colPrice }}>Unit Price</Text>
              <Text style={{ ...s.th, ...s.colAmt }}>Amount</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={s.tr}>
                <Text style={{ ...s.td, ...s.colDesc }}>
                  {item.description}
                </Text>
                <Text style={{ ...s.td, ...s.colQty }}>{item.quantity}</Text>
                <Text style={{ ...s.td, ...s.colPrice }}>
                  {formatAmount(item.unitPrice, data.currency)}
                </Text>
                <Text style={{ ...s.td, ...s.colAmt, fontWeight: 600 }}>
                  {formatAmount(item.amount, data.currency)}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Totals ── */}
          <View style={s.totalsWrap}>
            {hasAdjustments && (
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>Subtotal</Text>
                <Text style={s.subtotalVal}>
                  {formatAmount(subtotal, data.currency)}
                </Text>
              </View>
            )}

            {data.taxAmount && tax > 0 && (
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>{data.taxLabel || 'Tax'}</Text>
                <Text style={s.subtotalVal}>
                  {formatAmount(tax, data.currency)}
                </Text>
              </View>
            )}

            {data.discountAmount && discount > 0 && (
              <View style={s.subtotalRow}>
                <Text style={s.subtotalLabel}>
                  {data.discountLabel || 'Discount'}
                </Text>
                <Text style={{ ...s.subtotalVal, color: '#15803d' }}>
                  -{formatAmount(discount, data.currency)}
                </Text>
              </View>
            )}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total Due</Text>
              <Text style={s.totalVal}>
                {formatAmount(grandTotal, data.currency)}
              </Text>
            </View>
          </View>

          {/* ── Linked Requirements ── */}
          {data.linkedRequirements.length > 0 && (
            <View style={s.reqSection}>
              <Text style={s.label}>Linked Requirements</Text>
              {data.linkedRequirements.map((req, i) => (
                <View key={i} style={s.reqItem}>
                  <Text style={s.reqBullet}>{'\u2022'}</Text>
                  <Link
                    src={`${baseUrl}/${data.orgSlug}/${data.projectSlug}/requirements/${req.slug}`}
                    style={s.reqLink}
                  >
                    {req.title}
                  </Link>
                </View>
              ))}
            </View>
          )}

          {/* ── Payment information ── */}
          {paymentEntries.length > 0 && (
            <View style={s.paymentSection}>
              <Text style={{ ...s.label, marginBottom: 10 }}>
                Payment Information
              </Text>
              {paymentEntries.map((entry, i) => (
                <View key={i} style={s.paymentRow}>
                  <Text style={s.paymentKey}>{entry.label}</Text>
                  <Text style={s.paymentVal}>{entry.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Notes ── */}
          {data.notes && (
            <View style={s.noteBlock}>
              <Text style={s.noteLabel}>Notes</Text>
              <Text style={s.noteText}>{data.notes}</Text>
            </View>
          )}

          {/* ── Terms ── */}
          {data.terms && (
            <View style={{ ...s.noteBlock, marginTop: 14 }}>
              <Text style={s.noteLabel}>Terms & Conditions</Text>
              <Text style={s.noteText}>{data.terms}</Text>
            </View>
          )}

          {/* ── Signature ── */}
          {data.senderSignature && (
            <View style={s.sigBlock}>
              <Text style={s.sigLabel}>Authorized Signature</Text>
              <Image
                src={`${baseUrl}/api/files/${data.senderSignature}`}
                style={s.sigImg}
              />
              <View style={s.sigLine}>
                <Text style={s.sigName}>{fromName}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Footer ── */}
        <View fixed style={s.footer}>
          <Text style={s.footerLeft}>
            {data.invoiceNumber} {'\u00B7'} {data.projectName}
          </Text>
          <Link src={projectUrl} style={s.footerLink}>
            {projectUrl.replace(/^https?:\/\//, '')}
          </Link>
        </View>
      </Page>
    </Document>
  )
}
