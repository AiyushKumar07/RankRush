/**
 * TokenWallet — pill that shows current token balance.
 * Auto-recolors on plan (violet for Free, cyan for Pro).
 *
 * Usage:
 *   <TokenWallet balance={12} plan="free" />
 *   <TokenWallet balance={50} plan="pro" />
 */
import { Coins } from "lucide-react";

export default function TokenWallet({ balance = 0, plan = "free" }) {
  const isPro = plan === "pro";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: isPro
          ? "linear-gradient(120deg, var(--rr-cyan-500), var(--rr-cyan-600))"
          : "linear-gradient(120deg, var(--rr-violet-500), var(--rr-violet-700))",
        color: "white",
        height: 38,
        padding: "0 4px 0 14px",
        borderRadius: "var(--rr-r-full)",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "var(--rr-shadow-sm)",
      }}
    >
      <Coins size={14} />
      <span>Tokens</span>
      <span
        style={{
          background: isPro ? "#FAFAF7" : "var(--rr-lime-400)",
          color: isPro ? "var(--rr-cyan-600)" : "#0E0E13",
          fontFamily: "var(--rr-font-display)",
          fontWeight: 700,
          fontSize: 13,
          height: 28,
          minWidth: 28,
          padding: "0 8px",
          borderRadius: "var(--rr-r-full)",
          display: "grid",
          placeItems: "center",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {balance}
      </span>
    </div>
  );
}
