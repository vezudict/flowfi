import Link from 'next/link'
import type { ComponentProps } from 'react'

type BrandLogoLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'children'>

/** Marketing wordmark — always routes to the public landing page. */
export function BrandLogoLink(props: BrandLogoLinkProps) {
  const { className, ...rest } = props
  return (
    <Link href="/" className={className} {...rest}>
      FlowFi
    </Link>
  )
}
