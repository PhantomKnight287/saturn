import { Text } from '@react-email/components'
import { env } from '@/env'
import {
  ActionButton,
  EmailLayout,
  text,
} from '../components/layout'

const baseUrl = env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

interface VerifyEmailProps {
  name?: string
  verifyUrl: string
}

export default function VerifyEmail({
  name = 'there',
  verifyUrl = `${baseUrl}/verify`,
}: VerifyEmailProps) {
  return (
    <EmailLayout
      heading='Verify your email'
      preview='Confirm your email address to finish creating your Saturn account'
    >
      <Text style={text.paragraph}>
        Hi <span style={text.strong}>{name}</span>, thanks for signing up for
        Saturn. Please confirm your email address to activate your account.
      </Text>
      <ActionButton href={verifyUrl}>Verify email</ActionButton>
      <Text style={text.muted}>
        This link expires in 1 hour. If you didn't create a Saturn account, you
        can safely ignore this email.
      </Text>
    </EmailLayout>
  )
}
