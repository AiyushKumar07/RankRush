import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

const LEVEL_BG = [
  'bg-white/[0.025] border-white/[0.02]',
  'bg-accent-500/15 border-accent-500/20',
  'bg-accent-500/35 border-accent-400/30',
  'bg-accent-400/60 border-accent-300/40',
  'bg-gradient-to-br from-accent-300 to-neon-cyan border-accent-200/60',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWS = ['Mon', 'Wed', 'Fri'];

function formatDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * GitHub-style 7×N heatmap.
 * `cells` is row-major across weeks (column-major in render).
 */
export default function ActivityHeatmap({ cells, cellSize = 12, gap = 3, compact = false }) {
  const [hover, setHover] = useState(null);

  const { weeks, monthLabels, totals } = useMemo(() => {
    const wks = [];
    for (let i = 0; i < cells.length; i += 7) wks.push(cells.slice(i, i + 7));
    const labels = wks.map((week, i) => {
      const first = week[0]?.date;
      if (!first) return null;
      // Only label when first cell of column starts a new month
      const prev = i === 0 ? null : wks[i - 1][0]?.date;
      if (!prev || prev.getMonth() !== first.getMonth()) {
        return MONTHS[first.getMonth()];
      }
      return null;
    });
    const total = cells.reduce((s, c) => s + (c.future ? 0 : c.count), 0);
    const activeDays = cells.filter((c) => !c.future && c.count > 0).length;
    return { weeks: wks, monthLabels: labels, totals: { total, activeDays } };
  }, [cells]);

  return (
    <div className="relative">
      <div className="flex items-end gap-4">
        {/* Day-of-week labels */}
        <div
          className="flex flex-col justify-between text-[10px] text-dark-500 pb-1"
          style={{ height: 7 * (cellSize + gap) - gap }}
        >
          {DOWS.map((d) => (
            <span key={d} style={{ lineHeight: 1 }}>{d}</span>
          ))}
        </div>

        <div className="relative overflow-x-auto">
          {/* Month labels row */}
          <div className="flex" style={{ gap, marginBottom: 6 }}>
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[10px] text-dark-500"
                style={{ width: cellSize, minWidth: cellSize }}
              >
                {m}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap }}>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap }}>
                {week.map((cell, di) => (
                  <motion.div
                    key={di}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (wi * 7 + di) * 0.0015, duration: 0.25 }}
                    onMouseEnter={() => setHover({ cell, wi, di })}
                    onMouseLeave={() => setHover(null)}
                    className={cn(
                      'rounded-[3px] border transition-transform duration-150 hover:scale-[1.35]',
                      cell.future ? 'opacity-30' : 'cursor-pointer',
                      LEVEL_BG[cell.level],
                    )}
                    style={{ width: cellSize, height: cellSize }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-dark-400">
        {!compact && (
          <span>
            <span className="font-semibold text-dark-100">{totals.total}</span> contributions
            <span className="mx-1.5 text-dark-600">·</span>
            <span className="font-semibold text-dark-100">{totals.activeDays}</span> active days
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-dark-500">Less</span>
          {LEVEL_BG.map((cls, i) => (
            <div key={i} className={cn('rounded-[3px] border', cls)} style={{ width: cellSize, height: cellSize }} />
          ))}
          <span className="text-dark-500">More</span>
        </div>
      </div>

      {hover && !hover.cell.future && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-1 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg glass-frosted border border-white/[0.06] text-[11px] text-dark-100 pointer-events-none whitespace-nowrap"
        >
          <span className="font-semibold text-accent-300">{hover.cell.count}</span>
          {' '}activities on {formatDate(hover.cell.date)}
        </motion.div>
      )}
    </div>
  );
}
