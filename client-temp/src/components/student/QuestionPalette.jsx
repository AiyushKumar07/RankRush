/**
 * QuestionPalette — numbered question buttons with color states.
 *
 * @param {number}   total        - Total question count
 * @param {number}   current      - 0-based current question index
 * @param {Set}      answered     - Set of 0-based answered indices
 * @param {Set}      flagged      - Set of 0-based flagged indices
 * @param {Function} onNavigate   - (index) => void
 * @param {number}   [answeredCount] - Override for display count
 * @param {number}   [flaggedCount]  - Override for display count
 */
export default function QuestionPalette({
  total,
  current,
  answered,
  flagged,
  onNavigate,
}) {
  const answeredCount = answered.size;
  const flaggedCount = flagged.size;
  const remaining = total - answeredCount;

  return (
    <>
      <span className="q-palette-meta">
        <b>{answeredCount}</b> answered · <b>{flaggedCount}</b> flagged ·{" "}
        <b>{remaining}</b> to go
      </span>
      <div className="q-palette">
        {Array.from({ length: total }, (_, i) => {
          let cls = "q-num";
          if (i === current) cls += " current";
          else if (answered.has(i)) cls += " answered";
          if (flagged.has(i) && i !== current) cls += " flagged";
          return (
            <button key={i} className={cls} onClick={() => onNavigate(i)}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </>
  );
}
