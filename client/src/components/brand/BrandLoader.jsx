/**
 * BrandLoader — full-page loading screen with the RankRush chevron mark
 * pulsing in a staggered upward stack. Used by Suspense fallbacks and any
 * "the app is booting" gate.
 *
 * Props:
 *   label?: string         (default "Loading…")
 *   fullscreen?: boolean   (default true — grid placeItems center, min-h 100vh)
 */
import "./BrandLoader.css";

export default function BrandLoader({ label = "Loading…", fullscreen = true }) {
  return (
    <div className={`rr-loader${fullscreen ? " rr-loader-full" : ""}`}>
      <div className="rr-loader-mark" aria-hidden>
        <svg viewBox="0 0 64 64" fill="none">
          {/* Three chevrons, each pulses opacity + rises slightly in sequence.
              The CSS staggers them so the visual reads as an upward stack. */}
          <path
            className="rr-chev rr-chev-3"
            d="M14 50 L32 32 L50 50"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="rr-chev rr-chev-2"
            d="M14 38 L32 20 L50 38"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="rr-chev rr-chev-1"
            d="M14 26 L32 8 L50 26"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {label && <span className="rr-loader-label">{label}</span>}
    </div>
  );
}
