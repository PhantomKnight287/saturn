import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface EmailLayoutProps {
  accentColor?: string
  children: ReactNode
  heading: string
  preview: string
}

export function EmailLayout({
  preview,
  heading,
  accentColor = '#7c3aed',
  children,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fallbackFontFamily='Helvetica'
          fontFamily='Inter'
          fontStyle='normal'
          fontWeight={400}
          webFont={{
            url: 'https://fonts.gstatic.com/s/geist/v4/gyByhwUxId8gMEwYGFWNOITddY4.woff2',
            format: 'woff2',
          }}
        />
        <Font
          fallbackFontFamily='Helvetica'
          fontFamily='Inter'
          fontStyle='normal'
          fontWeight={600}
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwY.woff2',
            format: 'woff2',
          }}
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerSection}>
            <Row>
              <Column>
                <Link href={baseUrl} style={logoLink}>
                  <Img
                    alt='Saturn'
                    height={'30'}
                    // height="24"
                    src={`${baseUrl}/wordmark/logo_for_mark.png`}
                  />
                </Link>
              </Column>
              <Column align='right'>
                <Img
                  alt='Saturn'
                  height={'24'}
                  src={`${baseUrl}/wordmark/text.png`}
                />
              </Column>
            </Row>
          </Section>
          <Section style={headingSection}>
            <Text
              style={{
                ...headingStyle,
                borderLeft: `3px solid ${accentColor}`,
                paddingLeft: '14px',
              }}
            >
              {heading}
            </Text>
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You received this because you're part of a Saturn workspace.
            </Text>
            <Text style={footerLinks}>
              <Link href={baseUrl} style={footerLink}>
                Open Saturn
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function ActionButton({
  href,
  children,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: To have a constant brand color
  color = '#7c3aed',
}: {
  href: string
  children: ReactNode
  color?: string
}) {
  return (
    <Section style={buttonSection}>
      <Link
        href={href}
        style={{
          ...button,
          backgroundColor: '#7c3aed',
        }}
      >
        {children}
      </Link>
    </Section>
  )
}

export function InfoCard({ children }: { children: ReactNode }) {
  return <Section style={infoCard}>{children}</Section>
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Row style={infoRow}>
      <Column style={infoLabel}>{label}</Column>
      <Column align='right' style={infoValue}>
        {value}
      </Column>
    </Row>
  )
}

export function Badge({
  children,
  color = '#7c3aed',
}: {
  children: ReactNode
  color?: string
}) {
  return (
    <span
      style={{
        backgroundColor: `${color}18`,
        color,
        fontSize: '11px',
        fontWeight: '600',
        padding: '3px 10px',
        borderRadius: '20px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
      }}
    >
      {children}
    </span>
  )
}

export function QuoteBlock({
  children,
  borderColor = '#e4e4e7',
}: {
  children: ReactNode
  borderColor?: string
}) {
  return (
    <Section
      style={{
        ...quoteBlock,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {children}
    </Section>
  )
}

// Reusable text styles
export const text = {
  paragraph: {
    fontSize: '14px',
    color: '#3f3f46',
    lineHeight: '24px',
    margin: '0 0 16px',
  } as React.CSSProperties,
  muted: {
    fontSize: '13px',
    color: '#a1a1aa',
    lineHeight: '20px',
    margin: '0',
  } as React.CSSProperties,
  strong: {
    color: '#18181b',
    fontWeight: '600',
  } as React.CSSProperties,
  large: {
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: '1',
    margin: '0',
    textAlign: 'center' as const,
  } as React.CSSProperties,
}

// Layout styles
const body = {
  backgroundColor: '#fafafa',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '0',
}

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  margin: '40px auto',
  maxWidth: '520px',
  overflow: 'hidden' as const,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
}

const headerSection = {
  padding: '24px 32px 0',
}

const logoLink = {
  textDecoration: 'none',
}

const headingSection = {
  padding: '20px 32px 0',
}

const headingStyle = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#09090b',
  margin: '0',
  lineHeight: '28px',
}

const content = {
  padding: '16px 32px 24px',
}

const hr = {
  borderColor: '#f4f4f5',
  margin: '0',
}

const footer = {
  padding: '20px 32px 24px',
  backgroundColor: '#fafafa',
}

const footerText = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0 0 6px',
  textAlign: 'center' as const,
  lineHeight: '18px',
}

const footerLinks = {
  color: '#a1a1aa',
  fontSize: '12px',
  margin: '0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: '#71717a',
  textDecoration: 'underline',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '24px 0 8px',
}

const button = {
  borderRadius: '10px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 32px',
  textDecoration: 'none',
}

const infoCard = {
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '16px 0',
  border: '1px solid #f4f4f5',
}

const infoRow = {
  padding: '6px 0',
}

const infoLabel = {
  fontSize: '13px',
  color: '#71717a',
}

const infoValue = {
  fontSize: '14px',
  color: '#18181b',
  fontWeight: '600',
}

const quoteBlock = {
  backgroundColor: '#fafafa',
  borderRadius: '0 8px 8px 0',
  padding: '12px 16px',
  margin: '16px 0',
}
