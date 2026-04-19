import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  QuoteBlock,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface ThreadNewMessageEmailProps {
  contextName: string
  contextType: 'requirement' | 'invoice' | 'proposal'
  messagePreview: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
  senderName: string
  threadLink: string
  threadTitle: string
}

export default function ThreadNewMessageEmail({
  senderName = 'Jane Smith',
  threadTitle = 'Hero section copy needs revision',
  messagePreview = "I think we should use a more action-oriented headline here. The current one doesn't convey enough urgency for the launch.",
  contextType = 'requirement',
  contextName = 'Homepage Specifications',
  projectName = 'Website Redesign',
  threadLink = `${baseUrl}/acme/website-redesign/requirements/req_abc123#thread_123`,
}: ThreadNewMessageEmailProps) {
  return (
    <EmailLayout
      heading='New reply in thread'
      preview={`${senderName} replied: "${messagePreview.slice(0, 60)}..."`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{senderName}</span> replied in{' '}
        <span style={text.strong}>"{threadTitle}"</span> on the {contextType}{' '}
        <span style={text.strong}>{contextName}</span> in {projectName}.
      </Text>
      <QuoteBlock borderColor='#7c3aed'>
        <Text style={senderLabel}>{senderName}</Text>
        <Text style={messageBody}>{messagePreview}</Text>
      </QuoteBlock>
      <ActionButton href={threadLink}>Reply in Thread</ActionButton>
    </EmailLayout>
  )
}

const senderLabel = {
  fontSize: '12px',
  fontWeight: '600' as const,
  color: '#7c3aed',
  margin: '0 0 4px',
}

const messageBody = {
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '22px',
  margin: '0',
}
