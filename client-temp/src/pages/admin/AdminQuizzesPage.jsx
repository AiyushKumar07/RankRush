import { useState } from "react";
import {
  Upload, Download, Plus, Eye, EyeOff, Archive, Copy, Trash2, X,
  Edit, MoreHorizontal, ArrowLeft, ArrowRight, Info,
} from "lucide-react";
import "./AdminQuizzesPage.css";

const QUIZZES = [
  { color: "var(--rr-violet-500)", name: "Limits & continuity — your weak-spot mop-up", topic: "Math · Calculus · 20 Qs · 12 min", diffClass: "", diff: [1,1,1,0,0], tokens: 1, attempts: "1,247", score: "92%", scoreClass: "good", status: "Published", statusClass: "published", edited: "14m ago" },
  { color: "var(--rr-cyan-500)", name: "Rotational dynamics — torque & moment of inertia", topic: "Physics · Mechanics · 22 Qs · 18 min", diffClass: "physics", diff: [1,1,1,1,0], tokens: 1, attempts: "847", score: "58%", scoreClass: "bad", status: "Published", statusClass: "published", edited: "2h ago" },
  { color: "var(--rr-amber-500)", name: "Periodicity of properties — block by block", topic: "Chemistry · Inorganic · 20 Qs · 10 min", diffClass: "chem", diff: [1,1,0,0,0], tokens: 1, attempts: "2,134", score: "88%", scoreClass: "good", status: "Published", statusClass: "published", edited: "Yesterday" },
  { color: "linear-gradient(90deg, var(--rr-violet-500), var(--rr-cyan-500))", name: "JEE Main · Mock test 04 (full-length)", topic: "Mixed · PCM · 90 Qs · 3 hours", diffClass: "", diff: [1,1,1,1,0], tokens: 3, attempts: "894", score: "71%", scoreClass: "ok", status: "Published", statusClass: "published", edited: "3 days ago" },
  { color: "var(--rr-violet-500)", name: "Chain rule deep-dive — JEE-style", topic: "Math · Calculus · 20 Qs · 15 min", diffClass: "", diff: [1,1,1,0,0], tokens: 1, attempts: "1,189", score: "74%", scoreClass: "ok", status: "Published", statusClass: "published", edited: "5 days ago" },
  { color: "var(--rr-emerald-500)", name: "Photosynthesis — light + dark reactions", topic: "Biology · Botany · 20 Qs · 14 min", diffClass: "bio", diff: [1,1,1,0,0], tokens: 1, attempts: "912", score: "82%", scoreClass: "good", status: "Published", statusClass: "published", edited: "1 week ago" },
  { color: "var(--rr-amber-500)", name: "Aldol condensation — mechanism & products", topic: "Chemistry · Organic · 24 Qs · 20 min", diffClass: "chem", diff: [1,1,1,1,1], tokens: 1, attempts: "638", score: "52%", scoreClass: "bad", status: "Draft", statusClass: "draft", edited: "2h ago" },
  { color: "var(--rr-cyan-500)", name: "Wave optics — Young's double-slit experiment", topic: "Physics · Optics · 18 Qs · 14 min", diffClass: "physics", diff: [1,1,1,0,0], tokens: 1, attempts: "1,142", score: "76%", scoreClass: "ok", status: "Published", statusClass: "published", edited: "1 week ago" },
  { color: "var(--rr-violet-500)", name: "Quadratic equations — roots & Vieta's formulas", topic: "Math · Algebra · 18 Qs · 12 min", diffClass: "", diff: [1,1,0,0,0], tokens: 1, attempts: "3,421", score: "86%", scoreClass: "good", status: "Published", statusClass: "published", edited: "2 weeks ago" },
  { color: "var(--rr-emerald-500)", name: "Mendel's laws — dihybrid crosses", topic: "Biology · Genetics · 18 Qs · 12 min", diffClass: "bio", diff: [1,1,0,0,0], tokens: 1, attempts: "0", score: "—", scoreClass: "none", status: "Draft", statusClass: "draft", edited: "Just now" },
  { color: "var(--rr-cyan-500)", name: "Thermodynamics — first law applications", topic: "Physics · Thermo · 20 Qs · 16 min", diffClass: "physics", diff: [1,1,1,0,0], tokens: 1, attempts: "1,567", score: "78%", scoreClass: "ok", status: "Archived", statusClass: "archived", edited: "2 months ago" },
  { color: "var(--rr-amber-500)", name: "Chemical equilibrium — Kc, Kp, Le Chatelier", topic: "Chemistry · Physical · 20 Qs · 15 min", diffClass: "chem", diff: [1,1,1,0,0], tokens: 1, attempts: "1,801", score: "81%", scoreClass: "good", status: "Published", statusClass: "published", edited: "3 weeks ago" },
];

const SUBJECTS = ["All", "Math", "Physics", "Chemistry", "Biology", "Mixed"];
const STATUSES = ["All", "Published", "Draft", "Archived"];
const DIFFS = ["Any", "Easy", "Medium", "Hard"];

export default function AdminQuizzesPage() {
  const [selected, setSelected] = useState(new Set());
  const [allChecked, setAllChecked] = useState(false);
  const [subject, setSubject] = useState("All");
  const [status, setStatus] = useState("All");
  const [difficulty, setDifficulty] = useState("Any");
  const [page, setPage] = useState(1);

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(QUIZZES.map((_, i) => i)));
    }
    setAllChecked(!allChecked);
  };

  const toggleRow = (i) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
    setAllChecked(next.size === QUIZZES.length);
  };

  const clearSelection = () => {
    setSelected(new Set());
    setAllChecked(false);
  };

  return (
    <div className="admin-main">
      {/* Page header */}
      <div className="page-head">
        <div>
          <div className="crumb">Catalog / Quizzes</div>
          <h1>Quizzes</h1>
          <p className="sub">147 quizzes · 132 published · 12 in draft · 3 archived. Last edit 14 minutes ago.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary btn-sm"><Upload size={12} />Import CSV</button>
          <button className="btn btn-secondary btn-sm"><Download size={12} />Export</button>
          <button className="btn btn-accent btn-sm"><Plus size={12} />New quiz</button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="stat-strip">
        <div className="cell">
          <div className="lbl">Total quizzes</div>
          <div className="v">147</div>
        </div>
        <div className="cell">
          <div className="lbl">Attempts · 7d</div>
          <div className="v">12,847</div>
        </div>
        <div className="cell">
          <div className="lbl">Avg. accuracy</div>
          <div className="v">68.4<small>%</small></div>
        </div>
        <div className="cell">
          <div className="lbl">Draft · review</div>
          <div className="v">12</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="afilter">
        <span className="lbl">Subject</span>
        {SUBJECTS.map((s) => (
          <button key={s} className={`chip${subject === s ? " on" : ""}`} onClick={() => setSubject(s)}>{s}</button>
        ))}
        <span className="divider" />
        <span className="lbl">Status</span>
        {STATUSES.map((s) => (
          <button key={s} className={`chip${status === s ? " on" : ""}`} onClick={() => setStatus(s)}>{s}</button>
        ))}
        <span className="divider" />
        <span className="lbl">Difficulty</span>
        {DIFFS.map((d) => (
          <button key={d} className={`chip${difficulty === d ? " on" : ""}`} onClick={() => setDifficulty(d)}>{d}</button>
        ))}
        <div className="right">
          <span>Sort</span>
          <select>
            <option>Most recent</option>
            <option>Most attempted</option>
            <option>Highest accuracy</option>
            <option>Lowest accuracy</option>
            <option>Title A→Z</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="count">{selected.size} selected</span>
          <span style={{ opacity: 0.7, fontFamily: "var(--rr-font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>Bulk actions</span>
          <div className="ctrls">
            <button className="bulk-btn"><Eye size={13} />Publish</button>
            <button className="bulk-btn"><EyeOff size={13} />Unpublish</button>
            <button className="bulk-btn"><Archive size={13} />Archive</button>
            <button className="bulk-btn"><Copy size={13} />Duplicate</button>
            <button className="bulk-btn danger"><Trash2 size={13} />Delete</button>
            <button className="bulk-btn" onClick={clearSelection} style={{ marginLeft: 8, border: 0 }}><X size={13} /></button>
          </div>
        </div>
      )}

      {/* Quiz table */}
      <div className="acard">
        <table className="atable">
          <thead>
            <tr>
              <th style={{ width: 36, paddingLeft: 22 }}>
                <div className={`check${allChecked ? " on" : ""}`} onClick={toggleAll} />
              </th>
              <th style={{ minWidth: 240 }}>Quiz</th>
              <th className="opt-md">Difficulty</th>
              <th className="opt-md">Tokens</th>
              <th className="right" style={{ width: 96 }}>Attempts</th>
              <th className="right" style={{ width: 80 }}>Avg score</th>
              <th style={{ width: 110 }}>Status</th>
              <th className="opt-md" style={{ width: 130 }}>Last edited</th>
              <th className="right" style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {QUIZZES.map((q, i) => (
              <tr key={i}>
                <td>
                  <div className={`check${selected.has(i) ? " on" : ""}`} onClick={() => toggleRow(i)} />
                </td>
                <td>
                  <div className="subj-cell">
                    <span className="d" style={{ background: q.color }} />
                    <div>
                      <span className="name">{q.name}</span>
                      <span className="topic">{q.topic}</span>
                    </div>
                  </div>
                </td>
                <td className="opt-md">
                  <div className={`diff-mini ${q.diffClass}`}>
                    {q.diff.map((on, j) => (
                      <span key={j} className={`p${on ? " on" : ""}`} />
                    ))}
                  </div>
                </td>
                <td className="opt-md"><b>{q.tokens}</b></td>
                <td className="right"><b>{q.attempts}</b></td>
                <td className="right"><span className={`score-pill ${q.scoreClass}`}>{q.score}</span></td>
                <td><span className={`status-pill ${q.statusClass}`}>{q.status}</span></td>
                <td className="opt-md">{q.edited}</td>
                <td className="right">
                  <div className="row-actions">
                    <button className="row-act" title="View"><Eye size={14} /></button>
                    <button className="row-act" title="Edit"><Edit size={14} /></button>
                    <button className="row-act" title="More"><MoreHorizontal size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pager-bar">
          <span>Showing <b style={{ color: "var(--rr-fg)" }}>1–12</b> of 147 quizzes</span>
          <div className="pager">
            <button title="Previous"><ArrowLeft size={12} /></button>
            {[1, 2, 3, 4].map((p) => (
              <button key={p} className={page === p ? "on" : ""} onClick={() => setPage(p)}>{p}</button>
            ))}
            <span style={{ display: "inline-flex", alignItems: "center", color: "var(--rr-fg-dim)", padding: "0 4px" }}>…</span>
            <button onClick={() => setPage(13)}>13</button>
            <button title="Next"><ArrowRight size={12} /></button>
          </div>
        </div>
      </div>

      {/* Editor stub */}
      <div className="drawer-stub-card">
        <Info size={16} style={{ color: "var(--rr-violet-500)", flexShrink: 0 }} />
        <span>Clicking <b style={{ color: "var(--rr-fg)" }}>Edit</b> or <b style={{ color: "var(--rr-fg)" }}>New quiz</b> opens a side drawer with a question editor, AI generation, preview, and publish controls. Designed separately in the React handoff.</span>
      </div>
    </div>
  );
}
