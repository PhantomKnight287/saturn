import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { Card } from '@/components/ui/card'
import type { requirements } from '@/server/db/schema'
import type { Role } from '@/types'

type Requirement = typeof requirements.$inferSelect

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function RequirementCard({
  requirement,
  orgSlug,
  projectSlug,
  role,
  isClientInvolved,
}: {
  requirement: Requirement
  orgSlug: string
  projectSlug: string
  role: Role
  isClientInvolved?: boolean
}) {
  return (
    <Link
      className='h-full'
      href={`/${orgSlug}/${projectSlug}/requirements/${requirement.slug}`}
    >
      <Card className='flex h-full cursor-pointer flex-col gap-0 p-4 transition-colors hover:border-primary/50'>
        <div className='mb-1.5 flex items-center justify-between gap-2'>
          <StatusBadge
            role={role}
            status={requirement.status}
            isClientInvolved={isClientInvolved}
          />
          <span className='shrink-0 text-muted-foreground text-xs'>
            {formatDistanceToNow(new Date(requirement.updatedAt), {
              addSuffix: true,
            })}
          </span>
        </div>
        <h3 className='line-clamp-1 font-semibold'>{requirement.title}</h3>
        {requirement.body ? (
          <p className='mt-1 line-clamp-2 flex-1 text-muted-foreground text-sm'>
            {stripHtml(requirement.body)}
          </p>
        ) : (
          <p className='mt-1 flex-1 text-muted-foreground/50 text-sm italic'>
            No description
          </p>
        )}
      </Card>
    </Link>
  )
}
