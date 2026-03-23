import type { PropsWithChildren } from 'react'
import { Header } from '@/components/header'

export default function RootLayout(props: PropsWithChildren) {
  return (
    <div className='flex min-h-svh w-full flex-col'>
      <Header />
      {props.children}
    </div>
  )
}
