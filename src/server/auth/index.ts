import { apiKey } from '@better-auth/api-key'
import { createId } from '@paralleldrive/cuid2'
import { render } from '@react-email/render'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { lastLoginMethod, organization } from 'better-auth/plugins'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import InvitationEmail from '@/emails/templates/invitation'
import { env } from '@/env'
import { db } from '@/server/db'
import * as schema from '@/server/db/schema'
import { emailService } from '@/services/email.service'
import { ac, adminRole, clientRole, memberRole, ownerRole } from './permissions'
import { and, eq, isNull } from 'drizzle-orm'
import { memberRates, settings } from '@/server/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    apiKey(),
    lastLoginMethod(),
    organization({
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        client: clientRole,
      },
      async sendInvitationEmail(data) {
        const html = await render(
          InvitationEmail({
            invitedByName: data.inviter.user.name,
            organizationName: data.organization.name,
            role: data.role,
            inviteLink: `${env.NEXT_PUBLIC_BASE_URL}/invite/${data.id}`,
          })
        )
        await emailService.sendEmail({
          to: data.email,
          subject: `You've been invited to join ${data.organization.name}`,
          html,
        })
      },
      organizationHooks: {
        async afterAcceptInvitation({
          invitation,
          member,
          organization,
          user,
        }) {
          /// We can set the member hourly rate here. Per project override could be done when a member is added to a project
          const [setting] = await db
            .select()
            .from(settings)
            .where(
              and(
                eq(settings.organizationId, organization.id),
                isNull(settings.projectId)
              )
            )
          if (!setting) return
          await db.insert(memberRates).values({
            effectiveFrom: new Date(),
            hourlyRate: setting.defaultMemberRate,
            memberId: member.id,
            currency: setting.defaultCurrency,
          })
        },
        async afterCreateOrganization({ organization }) {
          const defaultCategories = [
            { name: 'Software & Tools', color: '#6366f1' },
            { name: 'Travel', color: '#f59e0b' },
            { name: 'Equipment', color: '#10b981' },
            { name: 'Office Supplies', color: '#8b5cf6' },
            { name: 'Communication', color: '#3b82f6' },
            { name: 'Professional Services', color: '#ec4899' },
            { name: 'Miscellaneous', color: '#6b7280' },
          ]
          await db.insert(schema.expenseCategories).values(
            defaultCategories.map((cat, i) => ({
              organizationId: organization.id,
              name: cat.name,
              color: cat.color,
              sortOrder: i,
            }))
          )
        },
      },
      teams: {
        enabled: true,
        allowRemovingAllTeams: false,
        defaultTeam: {
          enabled: true,
          async customCreateDefaultTeam(organization) {
            const team = await db
              .insert(schema.teams)
              .values({
                name: 'Default Team',
                organizationId: organization.id,
                createdAt: new Date(),
                id: createId(),
                updatedAt: new Date(),
              })
              .returning()
            return team[0] as {
              id: string
              name: string
              organizationId: string
              createdAt: Date
              updatedAt: Date
            }
          },
        },
      },
    }),
  ],
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  trustedOrigins: env.CORS_ORIGIN,
  baseURL: env.NEXT_PUBLIC_BASE_URL,
})

export const getSession = async (request?: NextRequest) => {
  return auth.api.getSession({
    headers: request ? request.headers : await headers(),
  })
}
