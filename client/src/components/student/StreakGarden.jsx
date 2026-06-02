import { Flame } from "lucide-react";

// Accepts either the legacy `data` (array of levels) or the new `cells`
// payload from /api/student/streak-garden which carries per-day metadata
// (login, quizzes, minutes). Both render the same heatmap; cells unlock
// the richer footer ("X blooms · Y misses · Zh studied").
export default function StreakGarden({
  data,
  cells,
  streak = 0,
  misses,
  blooms,
  totalMinutes,
  loading = false,
}) {
  const series = cells
    ? cells.map((c) => c.level ?? 0)
    : Array.isArray(data) ? data : [];

  const resolvedBlooms = blooms != null ? blooms
    : cells ? cells.filter((c) => (c.level ?? 0) >= 4).length
    : 2;
  const resolvedMisses = misses != null ? misses
    : cells ? cells.filter((c, i) => (c.level ?? 0) === 0 && i < cells.length - 1).length
    : 0;

  const hours = totalMinutes != null
    ? Math.round(totalMinutes / 60)
    : null;

  return (
    <div className="streak-card dcard">
      <div className="top-row">
        <div>
          <div className="lbl">Daily streak</div>
          <div className="big">
            <span className="n tabular">{streak}</span>
            <span className="u">days strong</span>
          </div>
        </div>
        <Flame size={32} className="flame" />
      </div>
      <div className="heat">
        {loading && series.length === 0 ? (
          // Empty placeholder grid while loading so the card doesn't pop
          // height when data arrives.
          Array.from({ length: 60 }).map((_, i) => <div key={i} className="c" />)
        ) : (
          series.map((level, i) => (
            <div key={i} className={`c${level > 0 ? ` s${level}` : ""}`} />
          ))
        )}
      </div>
      <div className="foot">
        <span>Last {series.length || 60} days</span>
        <span>
          <b>{resolvedBlooms}</b> bloom{resolvedBlooms === 1 ? '' : 's'} · {' '}
          <b>{resolvedMisses}</b> miss{resolvedMisses === 1 ? '' : 'es'}
          {hours != null && (<> · <b>{hours}h</b> studied</>)}
        </span>
      </div>
    </div>
  );
}
