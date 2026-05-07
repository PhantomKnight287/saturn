import { Text } from '@react-email/components'
import { env } from '@/env'
import { ActionButton, EmailLayout, text } from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface ForgotPasswordEmailProps {
  name?: string
  resetUrl: string
}

export default function ForgotPasswordEmail({
  name = 'there',
  resetUrl = `${baseUrl}/reset-password`,
}: ForgotPasswordEmailProps) {
  return (
    <EmailLayout
      heading='Reset your password'
      preview='Reset your Saturn account password'
    >
      <Text style={text.paragraph}>
        Hi <span style={text.strong}>{name}</span>, we received a request to
        reset the password for your Saturn account. Click the button below to
        choose a new one.
      </Text>
      <ActionButton href={resetUrl}>Reset password</ActionButton>
      <Text style={text.muted}>
        This link expires in 1 hour. If you didn't request a password reset, you
        can safely ignore this email — your password won't change.
      </Text>
    </EmailLayout>
  )
}
