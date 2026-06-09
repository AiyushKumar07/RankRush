import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop — resets scroll to the top on route changes.
 *
 * React Router preserves scroll position across client-side navigations
 * (unlike a full page load). Without this, navigating e.g. from the bottom of
 * /privacy to /terms lands you at the bottom of the new page.
 *
 * Keyed on `pathname` (and `hash`) — when the URL carries a hash (e.g.
 * /privacy#cookies from the footer), we scroll that section into view instead
 * of jumping to the top. Same-page anchor links (the legal pages' "On this
 * page" table of contents) keep working via the browser's native behaviour;
 * this only covers cross-page navigations React Router wouldn't otherwise
 * scroll for.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      // Instant, not smooth — a page change shouldn't animate a long scroll
      // up from the previous page's position (html has scroll-behavior: smooth).
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    // Cross-page hash links (e.g. /privacy#cookies) target a lazy-loaded
    // route whose chunk may still be in <Suspense> when this effect fires —
    // the element isn't in the DOM yet. Retry across a few frames until it
    // mounts, then give up (and reset to top) so we never spin forever.
    const id = hash.slice(1)
    let frames = 0
    let raf

    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      } else if (frames++ < 60) {
        raf = requestAnimationFrame(tryScroll)
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }
    tryScroll()

    return () => raf && cancelAnimationFrame(raf)
  }, [pathname, hash])

  return null
}
