/**
 * Button — wraps .btn classes from the design system.
 * Variants: primary, accent, secondary, ghost, lime.
 * Sizes: sm, md (default), lg.
 */
export default function Button({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  style,
  ...props
}) {
  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";
  const variantClass = variant ? `btn-${variant}` : "";
  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
