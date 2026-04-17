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

interface StakeholderAddedToProjectEmailProps {
  addedByName: string
  organizationName: string
  orgSlug: string
  projectName: string
  projectSlug: string
  recipientName: string
}

export default function StakeholderAddedToProjectEmail({
  recipientName = 'Jane Smith',
  projectName = 'Website Redesign',
  organizationName = 'Acme Studio',
  addedByName = 'John Doe',
  orgSlug = 'acme',
  projectSlug = 'website-redesign',
}: StakeholderAddedToProjectEmailProps) {
  return (
    <EmailLayout
      heading={`Welcome to ${projectName}`}
      preview={`You've been added to ${projectName} in ${organizationName}`}
    >
      <Text style={text.paragraph}>
        Hi {recipientName}, <span style={text.strong}>{addedByName}</span> has
        added you to a project in {organizationName}. Here's what you can
        expect:
      </Text>
      <InfoCard>
        <InfoRow label='Project' value={projectName} />
        <InfoRow label='Workspace' value={organizationName} />
      </InfoCard>
      <Section style={whatToExpect}>
        <Text style={whatToExpectItem}>
          <span style={bullet}>1</span> Review and sign off on project
          requirements
        </Text>
        <Text style={whatToExpectItem}>
          <span style={bullet}>2</span> Discuss details in threaded
          conversations
        </Text>
        <Text style={whatToExpectItem}>
          <span style={bullet}>3</span> Receive and manage invoices for
          completed work
        </Text>
      </Section>
      <ActionButton href={`${baseUrl}/${orgSlug}/${projectSlug}`}>
        View Project
      </ActionButton>
    </EmailLayout>
  )
}

const whatToExpect = {
  margin: '0 0 8px',
}

const whatToExpectItem = {
  fontSize: '13px',
  color: '#52525b',
  lineHeight: '20px',
  margin: '0 0 8px',
  paddingLeft: '4px',
}

const bullet = {
  display: 'inline-block' as const,
  width: '20px',
  height: '20px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  borderRadius: '50%',
  backgroundColor: '#f4f4f5',
  color: '#71717a',
  fontSize: '11px',
  fontWeight: '600' as const,
  marginRight: '8px',
}
