'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

const logoInteractionClasses =
  'cursor-pointer transition-opacity duration-150 hover:opacity-80'

export type BrandLogoLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'children'> & {
  /** Runs when the logo is clicked (e.g. close mobile nav). */
  onLogoActivate?: () => void
}

/** Wordmark linking to the landing page (`/`) from any route. */
export function BrandLogoLink({
  className,
  onLogoActivate,
  onClick,
  ...rest
}: BrandLogoLinkProps) {
  const mergedClassName = [className, logoInteractionClasses].filter(Boolean).join(' ')
  const wordmark = <span className="font-semibold">FlowFi</span>

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
