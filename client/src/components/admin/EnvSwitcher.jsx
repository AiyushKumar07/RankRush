/**
 * EnvSwitcher — Prod/Staging toggle for admin topbar.
 * Stores env state in localStorage and exposes it via style changes.
 */
import { useState, useEffect } from "react";

export default function EnvSwitcher() {
  const [env, setEnv] = useState(() => localStorage.getItem("rr-env") || "prod");

  useEffect(() => {
    localStorage.setItem("rr-env", env);
    document.documentElement.setAttribute("data-env", env);
  }, [env]);

  return (
    <div
      style={{
        display: "inline-flex",
        background: "var(--rr-bg-alt)",
        border: "1px solid var(--rr-border)",
        borderRadius: "var(--rr-r-full)",
        padding: 3,
        gap: 2,
      }}
    >
      {["prod", "staging"].map((e) => {
        const active = env === e;
        return (
          <button
            key={e}
            onClick={() => setEnv(e)}
            style={{
              background: active
                ? e === "prod" ? "var(--rr-coral-500)" : "var(--rr-amber-500)"
                : "transparent",
              color: active
                ? e === "prod" ? "white" : "var(--rr-ink-900)"
                : "var(--rr-fg-muted)",
              border: 0,
              padding: "5px 10px",
              borderRadius: "var(--rr-r-full)",
              fontFamily: "var(--rr-font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 140ms",
            }}
          >
            {e === "prod" ? "Prod" : "Staging"}
          </button>
        );
      })}
    </div>
  );
}

export function EnvTag() {
  const [env, setEnv] = useState(() => localStorage.getItem("rr-env") || "prod");

  useEffect(() => {
    const handler = () => setEnv(localStorage.getItem("rr-env") || "prod");
    window.addEventListener("storage", handler);
    const obs = new MutationObserver(() => {
      setEnv(document.documentElement.getAttribute("data-env") || "prod");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-env"] });
    return () => { window.removeEventListener("storage", handler); obs.disconnect(); };
  }, []);

  const isProd = env === "prod";
  return (
    <span
      className="env-tag"
      style={{
        fontFamily: "var(--rr-font-mono)",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        background: isProd
          ? "color-mix(in oklab, var(--rr-coral-500) 14%, transparent)"
          : "color-mix(in oklab, var(--rr-amber-500) 14%, transparent)",
        color: isProd ? "var(--rr-coral-500)" : "var(--rr-amber-500)",
        padding: "2px 6px",
        borderRadius: 4,
        border: `1px solid ${isProd
          ? "color-mix(in oklab, var(--rr-coral-500) 30%, transparent)"
          : "color-mix(in oklab, var(--rr-amber-500) 30%, transparent)"
        }`,
        fontWeight: 600,
      }}
    >
      {isProd ? "PROD" : "STAGING"}
    </span>
  );
}
