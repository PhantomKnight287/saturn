'use client'

import { KeyRound, Lock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const MOCK_KEYS = [
  { name: 'Production backend', prefix: 'saturn_a1b2' },
  { name: 'CI pipeline', prefix: 'saturn_c3d4' },
  { name: 'Zapier integration', prefix: 'saturn_e5f6' },
]

export function LockedState({
  onUpgrade,
  upgrading,
}: {
  onUpgrade: () => void
  upgrading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <div className='space-y-1'>
          <CardTitle className='flex items-center gap-2'>
            <KeyRound className='size-5' />
            API Keys
            <Badge variant='outline'>Pro</Badge>
          </CardTitle>
          <CardDescription>
            Create API keys to automate timesheets, generate invoices
            programmatically, and integrate with your existing tools.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className='relative overflow-hidden rounded-lg border'>
          <ul aria-hidden className='select-none divide-y blur-[3px]'>
            {MOCK_KEYS.map((k) => (
              <li
                className='flex items-center justify-between gap-3 p-3'
                key={k.name}
              >
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='truncate font-medium'>{k.name}</span>
                    <code className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
                      {k.prefix}…
                    </code>
                  </div>
                  <div className='flex items-center gap-3 text-muted-foreground text-xs'>
                    <span>Created 2 days ago</span>
                    <span>Never expires</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/70 p-6 text-center backdrop-blur-[2px]'>
            <div className='rounded-full border bg-background p-2.5'>
              <Lock className='size-4 text-muted-foreground' />
            </div>
            <div className='space-y-1'>
              <p className='font-medium text-sm'>Available on Pro</p>
              <p className='max-w-sm text-muted-foreground text-xs'>
                Upgrade to create API keys with fine-grained permissions scoped
                to this workspace.
              </p>
            </div>
            <Button
              loading={upgrading}
              onClick={onUpgrade}
              size='sm'
              type='button'
            >
              <Sparkles className='size-4' />
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
