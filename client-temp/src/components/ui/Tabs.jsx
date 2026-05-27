import { useState } from "react";

/**
 * Segmented control / tab bar — used for subject tabs, filter chips, etc.
 *
 * @param {Object[]}  items       - Array of { key, label, icon?, dot?, count? }
 * @param {string}    activeKey   - Currently active key
 * @param {Function}  onChange    - (key) => void
 * @param {string}    [variant]   - 'tabs' (default) | 'chips'
 * @param {string}    [className] - Extra wrapper class
 */
export function SegmentedTabs({ items, activeKey, onChange, className = "" }) {
  return (
    <div className={`subj-tabs ${className}`}>
      {items.map((item) => (
        <button
          key={item.key}
          className={`subj-tab${activeKey === item.key ? " on" : ""}`}
          onClick={() => onChange(item.key)}
        >
          {item.icon && item.icon}
          {item.dot && (
            <span className="dot" style={{ background: item.dot }} />
          )}
          {item.label}
          {item.count != null && <span className="count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * A single filter chip group with a label.
 *
 * @param {string}    label       - Group label (e.g. "Difficulty")
 * @param {Object[]}  items       - Array of { key, label }
 * @param {string}    activeKey   - Currently active key
 * @param {Function}  onChange    - (key) => void
 */
export function FilterChipGroup({ label, items, activeKey, onChange }) {
  return (
    <div className="filter-group">
      {label && <span className="gl">{label}</span>}
      {items.map((item) => (
        <button
          key={item.key}
          className={`chip${activeKey === item.key ? " on" : ""}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Self-managed segmented tabs with internal state.
 */
export default function Tabs({
  items,
  defaultKey,
  onChange,
  variant = "tabs",
  className,
}) {
  const [active, setActive] = useState(defaultKey || items[0]?.key);
  const handleChange = (key) => {
    setActive(key);
    onChange?.(key);
  };

  if (variant === "chips") {
    return (
      <FilterChipGroup
        items={items}
        activeKey={active}
        onChange={handleChange}
      />
    );
  }

  return (
    <SegmentedTabs
      items={items}
      activeKey={active}
      onChange={handleChange}
      className={className}
    />
  );
}
