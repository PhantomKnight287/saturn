import type { SVGProps } from 'react'

const BetterAuth = (props: SVGProps<SVGSVGElement>) => (
  <svg
    fill='none'
    height='1em'
    viewBox='0 0 500 500'
    width='1em'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M69 121h86.988v259H69zM337.575 121H430v259h-92.425z'
      fill={props.fill}
    />
    <path
      d='M427.282 121v83.456h-174.52V121zM430 296.544V380H252.762v-83.456z'
      fill={props.fill}
    />
    <path d='M252.762 204.455v92.089h-96.774v-92.089z' fill={props.fill} />
  </svg>
)

export default BetterAuth
