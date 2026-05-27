/**
 * RankBarHero — the signature moment.
 *
 * Big dark card with a current rank (#88), delta pill (+14), gradient progress
 * bar with a bobbing white marker, and a 4-step history trail with a tiny
 * sparkline. Drop onto the student dashboard.
 *
 * Props:
 *   rank            current rank, e.g. 88
 *   delta           number of ranks climbed this week (positive number)
 *   totalStudents   denominator for the "ahead of X students" copy
 *   percentile      "you're ahead of X%" — number 0-100
 *   topRank         top rank for the bar's scale (defaults 1)
 *   bottomRank      bottom rank for the bar's scale (defaults totalStudents)
 *   history         optional [{ when, rank }] (4 expected) for the foot trail
 *   subline         e.g. "JEE Main · Class 12"
 *
 * The bar position is computed from rank: a #88 of 12,481 is far up the bar.
 * "Better rank" maps to the right side of the bar.
 */
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

const DEFAULT_HISTORY = [
  { when: "4 wks ago", rank: 1204 },
  { when: "2 wks ago", rank: 412 },
  { when: "Last wk",   rank: 247 },
  { when: "Now",       rank: 88 },
];

export default function RankBarHero({
  rank = 88,
  delta = 14,
  totalStudents = 12481,
  percentile = 71.8,
  topRank = 1,
  bottomRank,
  history = DEFAULT_HISTORY,
  subline = "JEE Main · Class 12",
}) {
  const bot = bottomRank ?? totalStudents;
  // Map rank → 0–1 progress. Better rank (smaller number) = further right.
  const progress = Math.min(0.96, Math.max(0.04, 1 - (rank - topRank) / (bot - topRank)));
  const pct = (progress * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: "var(--rr-ink-900)",
        color: "var(--rr-paper)",
        borderRadius: "var(--rr-r-2xl)",
        padding: "28px 32px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--rr-shadow-lg)",
      }}
    >
      {/* radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 0% 100%, color-mix(in oklab, var(--rr-violet-500) 22%, transparent), transparent 50%), radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--rr-cyan-500) 14%, transparent), transparent 50%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Eyebrow row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            fontFamily: "var(--rr-font-mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--rr-ink-300)",
            marginBottom: 14,
          }}
        >
          <span style={{ color: "var(--rr-coral-400)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                background: "var(--rr-coral-400)",
                borderRadius: "50%",
                animation: "rr-pulse 1.6s ease-in-out infinite",
              }}
            />
            Live
          </span>
          <span>Your rank this week · {subline}</span>
        </div>

        {/* Big number + delta */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 8 }}>
          <span
            className="tabular"
            style={{
              fontFamily: "var(--rr-font-display)",
              fontWeight: 700,
              fontSize: 56,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              color: "var(--rr-paper)",
            }}
          >
            #{rank.toLocaleString()}
          </span>
          {delta > 0 && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 400, damping: 22 }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "color-mix(in oklab, var(--rr-lime-400) 22%, transparent)",
                color: "var(--rr-lime-400)",
                fontFamily: "var(--rr-font-display)",
                fontWeight: 700,
                fontSize: 14,
                padding: "4px 10px",
                borderRadius: "var(--rr-r-full)",
                border: "1px solid color-mix(in oklab, var(--rr-lime-400) 35%, transparent)",
              }}
            >
              <ArrowUp size={14} />+{delta} this week
            </motion.span>
          )}
        </div>

        <div style={{ fontSize: 13, color: "var(--rr-ink-300)", marginBottom: 20 }}>
          Ahead of{" "}
          <b style={{ color: "var(--rr-paper)", fontWeight: 600 }}>
            {(totalStudents - rank).toLocaleString()} students
          </b>{" "}
          · <b style={{ color: "var(--rr-paper)", fontWeight: 600 }}>{percentile}%</b> of the field
        </div>

        {/* The bar */}
        <div
          style={{
            position: "relative",
            height: 14,
            background: "rgba(255,255,255,0.06)",
            borderRadius: "var(--rr-r-full)",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 14,
          }}
        >
          <motion.div
            initial={{ width: "10%" }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              right: "auto",
              background: "linear-gradient(90deg, var(--rr-violet-400), var(--rr-cyan-400))",
              borderRadius: "var(--rr-r-full)",
              boxShadow: "0 0 24px rgba(132,114,255,0.4)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--rr-font-mono)",
            fontSize: 10,
            color: "var(--rr-ink-300)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 24,
          }}
        >
          <span>
            <b style={{ color: "var(--rr-paper)", fontFamily: "var(--rr-font-display)" }}>
              #{bot.toLocaleString()}
            </b>{" "}
            bottom
          </span>
          <span>
            <b style={{ color: "var(--rr-paper)", fontFamily: "var(--rr-font-display)" }}>
              #{topRank}
            </b>{" "}
            top
          </span>
        </div>

        {/* History trail */}
        {history?.length > 0 && (
          <div style={{ display: "flex", gap: 24, alignItems: "flex-end", paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            {history.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontFamily: "var(--rr-font-mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--rr-ink-300)",
                }}
              >
                <span>{h.when}</span>
                <b
                  className="tabular"
                  style={{
                    fontFamily: "var(--rr-font-display)",
                    fontWeight: 700,
                    fontSize: 20,
                    letterSpacing: "-0.02em",
                    color: i === history.length - 1 ? "var(--rr-lime-400)" : "var(--rr-paper)",
                  }}
                >
                  #{h.rank.toLocaleString()}
                </b>
              </div>
            ))}
            <Sparkline data={history.map(h => h.rank)} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes rr-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--rr-coral-500) 70%, transparent); }
          70% { box-shadow: 0 0 0 6px color-mix(in oklab, var(--rr-coral-500) 0%, transparent); }
        }
      `}</style>
    </motion.div>
  );
}

function Sparkline({ data }) {
  // Smaller rank = better. Invert so the chart trends UP for "climbing".
  const max = Math.max(...data);
  const min = Math.min(...data);
  return (
    <div style={{ flex: 1, minWidth: 120, height: 40, display: "flex", alignItems: "end", gap: 3 }}>
      {data.map((d, i) => {
        const h = max === min ? 50 : 20 + ((max - d) / (max - min)) * 70;
        const isLast = i === data.length - 1;
        return (
          <span
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: isLast ? "var(--rr-lime-400)" : "var(--rr-violet-400)",
              opacity: isLast ? 1 : 0.6,
              borderRadius: "2px 2px 0 0",
            }}
          />
        );
      })}
    </div>
  );
}
