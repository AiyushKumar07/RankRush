/**
 * ChurningLoader — full-screen branded overlay that cycles through a list of
 * status messages, so a slow round-trip (e.g. Google sign-in → account
 * creation) reads as "we're working on it" instead of a frozen screen.
 *
 * Reuses the BrandLoader chevron mark for the animation; layers a rotating,
 * fading caption underneath.
 *
 * Props:
 *   messages?: string[]   ordered captions to churn through (default below)
 *   interval?: number     ms per caption (default 1600)
 */
import { useEffect, useState } from 'react'
import BrandLoader from './BrandLoader'
import './ChurningLoader.css'

const DEFAULT_MESSAGES = [
  'Gathering your information…',
  'Verifying your Google account…',
  'Setting up your profile…',
  'Calibrating your quiz library…',
  'Almost there…',
]

export default function ChurningLoader({ messages = DEFAULT_MESSAGES, interval = 1600 }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (messages.length <= 1) return
    const t = setInterval(() => {
      // Hold on the final message once we reach it — the work is "almost
      // there", so we don't want to loop back to "Gathering…".
      setI((n) => Math.min(n + 1, messages.length - 1))
    }, interval)
    return () => clearInterval(t)
  }, [messages.length, interval])

  return (
    <div className="churn-overlay" role="status" aria-live="polite">
      <BrandLoader label="" fullscreen={false} />
      <p className="churn-msg" key={i}>{messages[i]}</p>
    </div>
  )
}
