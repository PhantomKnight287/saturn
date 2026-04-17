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

interface InvitationEmailProps {
  invitedByName: string
  inviteLink: string
  organizationName: string
  role: string
}

const roleLabelMap: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Team Member',
  client: 'Stakeholder',
}

export default function InvitationEmail({
  invitedByName = 'John Doe',
  organizationName = 'Acme Studio',
  role = 'member',
  inviteLink = `${baseUrl}/invite/abc123`,
}: InvitationEmailProps) {
  const roleLabel = roleLabelMap[role] ?? role

  return (
    <EmailLayout
      heading={`Join ${organizationName}`}
      preview={`${invitedByName} invited you to join ${organizationName}`}
    >
      <Text style={text.paragraph}>
        <span style={text.strong}>{invitedByName}</span> has invited you to
        collaborate on Saturn as a <span style={text.strong}>{roleLabel}</span>.
      </Text>
      <InfoCard>
        <InfoRow label='Workspace' value={organizationName} />
        <InfoRow label='Your role' value={roleLabel} />
      </InfoCard>
      <ActionButton href={inviteLink}>Accept & Join</ActionButton>
      <Text style={text.muted}>
        This invitation expires in 7 days. If you weren't expecting this, you
        can safely ignore it.
      </Text>
    </EmailLayout>
  )
}
