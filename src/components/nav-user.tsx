'use client'

import { useRouter } from '@bprogress/next/app'
import {
  Laptop,
  LogIn,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
  User as UserIcon,
  UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'

export function NavUser() {
  const session = authClient.useSession()
  const router = useRouter()
  const { setTheme } = useTheme()
  const user = session.data?.user

  const themeMenu = (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Sun className='mr-2 size-4 scale-100 dark:scale-0' />
        <Moon className='mr-2 -ml-6 size-4 scale-0 dark:scale-100' />
        Theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Laptop />
          System
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )

  return (
    <SidebarMenu className='w-fit'>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
              size='lg'
            >
              {user ? (
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage alt={user.name} src={user.image ?? ''} />
                  <AvatarFallback className='rounded-lg'>
                    {user.name ? user.name.charAt(0) : 'U'}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className='flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground'>
                  <UserIcon className='size-4' />
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align='end'
            className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
            side={'bottom'}
            sideOffset={4}
          >
            {user ? (
              <>
                <DropdownMenuLabel className='p-0 font-normal'>
                  <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                    <Avatar className='h-8 w-8 rounded-lg'>
                      <AvatarImage alt={user.name} src={user.image ?? ''} />
                      <AvatarFallback className='rounded-lg'>
                        {user.name ? user.name.charAt(0) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='grid flex-1 text-left text-sm leading-tight'>
                      <span className='truncate font-medium'>{user.name}</span>
                      <span className='truncate text-xs'>{user.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themeMenu}
                <DropdownMenuItem asChild>
                  <a href='/api/featurebase/sso' rel='noopener' target='_blank'>
                    <MessageSquare />
                    Feedback
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.signOut()
                    await router.replace('/')
                  }}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                {themeMenu}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href='/auth/sign-in'>
                    <LogIn />
                    Sign in
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href='/auth/sign-up'>
                    <UserPlus />
                    Create account
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
