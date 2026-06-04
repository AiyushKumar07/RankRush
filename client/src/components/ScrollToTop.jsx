import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop — resets scroll to the top on route changes.
 *
 * React Router preserves scroll position across client-side navigations
 * (unlike a full page load). Without this, navigating e.g. from the bottom of
 * /privacy to /terms lands you at the bottom of the new page.
 *
 * Keyed on `pathname` only — NOT `hash` — so in-page anchor links (the legal
 * pages' "On this page" table of contents) still jump to their section.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
