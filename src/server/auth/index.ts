import { apiKey } from '@better-auth/api-key'
import { createId } from '@paralleldrive/cuid2'
import { checkout, polar, portal, webhooks } from '@polar-sh/better-auth'
import { render } from '@react-email/render'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { lastLoginMethod, organization } from 'better-auth/plugins'
import { and, count, eq, isNull } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { getUserBillingStatus } from '@/cache/billing'
import { BillingCacheKeys } from '@/cache/billing/keys'
import InvitationEmail from '@/emails/templates/invitation'
import VerifyEmail from '@/emails/templates/verify-email'
import { env } from '@/env'
import { polarClient } from '@/lib/polar'
import { FREE_PLAN_LIMITS } from '@/limits'
import { db } from '@/server/db'
import * as schema from '@/server/db/schema'
import { memberRates, pendingMemberRates, settings } from '@/server/db/schema'
import { emailService } from '@/services/email.service'
import { ac, adminRole, clientRole, memberRole, ownerRole } from './permissions'

function invalidateBillingCache(organizationId: string | null | undefined) {
  if (!organizationId) {
    return
  }
  for (const tag of BillingCacheKeys.getOrganizationBillingStatus(
    organizationId
  )) {
    revalidateTag(tag, 'max')
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    async sendVerificationEmail({ user, url }) {
      const verifyUrl = new URL(url)
      verifyUrl.searchParams.set(
        'callbackURL',
        `${env.NEXT_PUBLIC_BASE_URL}/dashboard`
      )
      const html = await render(
        VerifyEmail({
          name: user.name,
          verifyUrl: verifyUrl.toString(),
        })
      )
      await emailService.sendEmail({
        to: user.email,
        subject: 'Verify your email for Saturn',
        html,
      })
    },
  },
  plugins: [
    apiKey({
      enableMetadata: true,
      references: 'organization',
      rateLimit: {
        enabled: true,
        timeWindow: 1000 * 60,
        maxRequests: 120,
      },
    }),
    lastLoginMethod(),
    organization({
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        client: clientRole,
      },
      async allowUserToCreateOrganization(user) {
        const hasActiveSubscription = await getUserBillingStatus(user.id)
        if (hasActiveSubscription) {
          return true
        }

        const [row] = await db
          .select({ value: count() })
          .from(schema.members)
          .where(
            and(
              eq(schema.members.userId, user.id),
              eq(schema.members.role, 'owner')
            )
          )
        const ownedCount = row?.value ?? 0

        if (ownedCount >= FREE_PLAN_LIMITS.WORKSPACES) {
          throw new APIError('PAYMENT_REQUIRED', {
            message: `Free plan is limited to ${FREE_PLAN_LIMITS.WORKSPACES} workspace. Upgrade to Pro to create additional workspaces.`,
          })
        }
        return true
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
        async afterAcceptInvitation({ invitation, member, organization }) {
          // Check for a rate specified at invite time
          const [pendingRate] = await db
            .select()
            .from(pendingMemberRates)
            .where(eq(pendingMemberRates.invitationId, invitation.id))

          if (pendingRate) {
            await db.insert(memberRates).values({
              effectiveFrom: new Date(),
              hourlyRate: pendingRate.hourlyRate,
              memberId: member.id,
              currency: pendingRate.currency,
            })
            await db
              .delete(pendingMemberRates)
              .where(eq(pendingMemberRates.id, pendingRate.id))
            return
          }

          // Fall back to workspace wide defaults
          const [setting] = await db
            .select()
            .from(settings)
            .where(
              and(
                eq(settings.organizationId, organization.id),
                isNull(settings.projectId)
              )
            )
          if (!setting) {
            return
          }
          await db.insert(memberRates).values({
            effectiveFrom: new Date(),
            hourlyRate: setting.memberRate,
            memberId: member.id,
            currency: setting.currency,
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

          const owner = await db
            .select({ email: schema.users.email, name: schema.users.name })
            .from(schema.members)
            .innerJoin(schema.users, eq(schema.members.userId, schema.users.id))
            .where(
              and(
                eq(schema.members.organizationId, organization.id),
                eq(schema.members.role, 'owner')
              )
            )
            .then((r) => r.at(0))

          if (owner) {
            await polarClient.customers
              .create({
                email: owner.email,
                name: owner.name ?? organization.name,
                externalId: organization.id,
                metadata: { organizationName: organization.name },
              })
              .catch(() => {
                // Customer may already exist — safe to ignore
              })
          }
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
    polar({
      client: polarClient,
      /// we don't need to create a customer on sign up, as only owners can upgrade themselves, we create them when they create a new organization
      createCustomerOnSignUp: false,
      use: [
        checkout({
          products: [
            {
              productId: env.POLAR_PRODUCT_ID,
              slug: env.POLAR_PRODUCT_SLUG,
            },
          ],
          successUrl: `${env.NEXT_PUBLIC_BASE_URL}/success?checkout_id={CHECKOUT_ID}`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          secret: env.POLAR_WEBHOOK_SECRET,
          onSubscriptionCreated: async ({ data }) => {
            await invalidateBillingCache(data.customer.externalId)
          },
          onSubscriptionUpdated: async ({ data }) => {
            await invalidateBillingCache(data.customer.externalId)
          },
        }),
      ],
    }),
  ],
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
