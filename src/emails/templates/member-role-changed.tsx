import { Section, Text } from '@react-email/components'
import { ActionButton, EmailLayout, text } from '../components/layout'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface MemberRoleChangedEmailProps {
  changedByName: string
  memberName: string
  newRole: string
  oldRole: string
  organizationName: string
  orgSlug: string
}

const roleLabelMap: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Team Member',
  client: 'Stakeholder',
}

export default function MemberRoleChangedEmail({
  memberName = 'Jane Smith',
  organizationName = 'Acme Studio',
  oldRole = 'member',
  newRole = 'admin',
  changedByName = 'John Doe',
  orgSlug = 'acme',
}: MemberRoleChangedEmailProps) {
  const oldLabel = roleLabelMap[oldRole] ?? oldRole
  const newLabel = roleLabelMap[newRole] ?? newRole

  return (
    <EmailLayout
      heading='Your role has been updated'
      preview={`Your role in ${organizationName} changed to ${newLabel}`}
    >
      <Text style={text.paragraph}>
        Hi {memberName}, <span style={text.strong}>{changedByName}</span>{' '}
        updated your role in <span style={text.strong}>{organizationName}</span>
        .
      </Text>
      <Section style={roleChangeSection}>
        <table
          cellPadding={0}
          cellSpacing={0}
          style={{ width: '100%', borderCollapse: 'collapse' as const }}
        >
          <tbody>
            <tr>
              <td style={roleBox}>
                <Text style={roleLabel}>Previous</Text>
                <Text style={roleName}>{oldLabel}</Text>
              </td>
              <td style={arrow}>→</td>
              <td style={roleBox}>
                <Text style={roleLabel}>New</Text>
                <Text style={{ ...roleName, color: '#7c3aed' }}>
                  {newLabel}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>
      <ActionButton href={`${baseUrl}/${orgSlug}`}>
        Go to {organizationName}
      </ActionButton>
    </EmailLayout>
  )
}

const roleChangeSection = {
  margin: '8px 0 8px',
}

const roleBox = {
  backgroundColor: '#fafafa',
  borderRadius: '10px',
  padding: '16px',
  textAlign: 'center' as const,
  width: '44%',
  border: '1px solid #f4f4f5',
}

const roleLabel = {
  fontSize: '11px',
  color: '#a1a1aa',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px',
}

const roleName = {
  fontSize: '16px',
  fontWeight: '700' as const,
  color: '#18181b',
  margin: '0',
}

const arrow = {
  textAlign: 'center' as const,
  fontSize: '18px',
  color: '#a1a1aa',
  width: '12%',
  verticalAlign: 'middle' as const,
}
