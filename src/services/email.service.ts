import { createLogger } from 'evlog'
import type { Transporter } from 'nodemailer'
import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { env } from '@/env'

const log = createLogger({ module: 'email-service' })

interface SendEmailParams {
  from?: string
  html: string
  replyTo?: string
  subject: string
  text?: string
  to: string
}

class EmailService {
  private readonly transporter: Transporter | null
  private readonly defaultSender: string
  private readonly proxyUrl: string | null
  private readonly proxySecret: string | null

  constructor() {
    this.proxyUrl = env.EMAIL_PROXY ?? null
    this.proxySecret = env.EMAIL_PROXY_SECRET ?? null

    if (this.proxyUrl) {
      this.transporter = null
      log.info('Using email proxy', { proxy: this.proxyUrl })
    } else {
      this.transporter = nodemailer.createTransport({
        host: env.MAIL_HOST,
        port: env.MAIL_PORT,
        secure: env.MAIL_SECURE,
        auth: {
          user: env.MAIL_USER,
          pass: env.MAIL_PASSWORD,
        },
      } as SMTPTransport.Options)
    }

    this.defaultSender = env.EMAIL_SENDER
      ? `Saturn <${env.EMAIL_SENDER}>`
      : 'Saturn <noreply@saturn.procrastinator.fyi>'
  }

  async sendEmail({
    to,
    subject,
    html,
    from,
    replyTo,
    text,
  }: SendEmailParams): Promise<void> {
    const sender = from || this.defaultSender

    if (this.proxyUrl) {
      return this.sendViaProxy({ to, subject, html, from: sender, text })
    }

    const mailOptions: Parameters<Transporter['sendMail']>[0] = {
      from: sender,
      to,
      subject,
      html,
      replyTo: replyTo || sender,
      text,
    }

    try {
      const res = await this.transporter!.sendMail(mailOptions)
      log.info('Email sent', { to, subject, messageId: res.messageId })
    } catch (error) {
      log.error('Failed to send email', { to, subject, error })
      throw new Error(`Failed to send email: ${error}`)
    }
  }

  private async sendViaProxy({
    to,
    subject,
    html,
    from,
    text,
  }: {
    to: string
    subject: string
    html: string
    from: string
    text?: string
  }): Promise<void> {
    try {
      const res = await fetch(this.proxyUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          htmlBody: html,
          textBody: text,
          from,
          secret: this.proxySecret,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Proxy responded with ${res.status}: ${body}`)
      }

      log.info('Email sent via proxy', { to, subject })
    } catch (error) {
      log.error('Failed to send email via proxy', { to, subject, error })
      throw new Error(`Failed to send email via proxy: ${error}`)
    }
  }
}

export const emailService = new EmailService()
