'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps, MouseEvent } from 'react'

type BrandLogoLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'children'>

const logoInteractionClasses =
  'cursor-pointer transition-opacity duration-150 hover:opacity-80'

/** Wordmark: on "/" smooth-scrolls to top; elsewhere navigates to the landing page. */
export function BrandLogoLink({ className, onClick, ...rest }: BrandLogoLinkProps) {
  const pathname = usePathname()
  const mergedClassName = [className, logoInteractionClasses].filter(Boolean).join(' ')

  const wordmark = <span className="font-semibold">FlowFi</span>

  if (pathname === '/') {
    return (
      <button
        type="button"
        className={mergedClassName}
        onClick={(e) => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
          onClick?.(e as unknown as MouseEvent<HTMLAnchorElement>)
        }}
      >
        {wordmark}
      </button>
    )
  }

  return (
    <Link href="/" className={mergedClassName} onClick={onClick} {...rest}>
      {wordmark}
    </Link>
  )
}
