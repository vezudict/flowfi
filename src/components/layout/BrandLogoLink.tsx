'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'

const logoInteractionClasses =
  'cursor-pointer transition-opacity duration-150 hover:opacity-80'

export type BrandLogoLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'children'> & {
  /** Runs after the logo action (scroll on home, or when starting navigation to `/`). */
  onLogoActivate?: () => void
}

/**
 * On `/`, scrolls smoothly to top without navigating.
 * On app routes, navigates to the landing page via `<Link href="/">`.
 */
export function BrandLogoLink({
  className,
  onLogoActivate,
  onClick,
  ...rest
}: BrandLogoLinkProps) {
  const pathname = usePathname()
  const mergedClassName = [className, logoInteractionClasses].filter(Boolean).join(' ')
  const wordmark = <span className="font-semibold">FlowFi</span>

  if (pathname === '/') {
    return (
      <button
        type="button"
        className={mergedClassName}
        aria-label="Scroll to top"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
          onLogoActivate?.()
        }}
      >
        {wordmark}
      </button>
    )
  }

  return (
    <Link
      href="/"
      className={mergedClassName}
      onClick={(e) => {
        onLogoActivate?.()
        onClick?.(e)
      }}
      {...rest}
    >
      {wordmark}
    </Link>
  )
}
