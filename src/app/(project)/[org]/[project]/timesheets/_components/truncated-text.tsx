'use client'

import type { ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function TruncatedText({
  text,
  className,
  children,
}: {
  text: string
  className?: string
  children?: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('block truncate', className)}>
          {children ?? text}
        </span>
      </TooltipTrigger>
      <TooltipContent className='max-w-xs whitespace-normal break-words'>
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
