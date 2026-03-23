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
  private readonly transporter: Transporter
  private readonly defaultSender: string

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.MAIL_HOST,
      port: env.MAIL_PORT,
      secure: env.MAIL_SECURE, // true for 465, false for other ports
      auth: {
        user: env.MAIL_USER,
        pass: env.MAIL_PASSWORD,
      },
    } as SMTPTransport.Options)

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

    const mailOptions: Parameters<Transporter['sendMail']>[0] = {
      from: sender,
      to,
      subject,
      html,
      replyTo: replyTo || sender,
      text,
    }

    try {
      const res = await this.transporter.sendMail(mailOptions)
      log.info('Email sent', { to, subject, messageId: res.messageId })
    } catch (error) {
      log.error('Failed to send email', { to, subject, error })
      throw new Error(`Failed to send email: ${error}`)
    }
  }
}

export const emailService = new EmailService()
