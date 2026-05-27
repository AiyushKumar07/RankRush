import { Flame } from "lucide-react";

export default function StreakGarden({ data, streak, misses }) {
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
        {data.map((level, i) => (
          <div key={i} className={`c${level > 0 ? ` s${level}` : ""}`} />
        ))}
      </div>
      <div className="foot">
        <span>Last {data.length} days</span>
        <span>
          <b>2</b> blooms · <b>{misses}</b> misses
        </span>
      </div>
    </div>
  );
}
