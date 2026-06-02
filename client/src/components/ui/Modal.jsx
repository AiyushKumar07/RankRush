import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Reusable modal overlay.
 *
 * @param {boolean}  open       - Whether the modal is visible
 * @param {Function} onClose    - Called when backdrop / X is clicked
 * @param {string}   [title]    - Optional header title
 * @param {ReactNode} children  - Modal body
 * @param {ReactNode} [footer]  - Optional footer (buttons, etc.)
 * @param {"sm"|"md"|"lg"|"xl"} [size] - Width preset (default "md" = 520px).
 *   Larger callers (wizards, data pickers) should use "lg" / "xl" to avoid
 *   horizontal overflow from inner content.
 */
export default function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`modal-dialog modal-dialog--${size}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="modal-header">
            <h3 className="modal-title">{title}</h3>
            <button
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
