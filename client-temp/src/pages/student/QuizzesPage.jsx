import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid, Shuffle, FileText, Bookmark, History, Clock,
  CircleCheck, Zap, TrendingUp, Play, Sparkles, ArrowLeft,
  ArrowRight, ArrowDownUp, List,
} from "lucide-react";
import { SegmentedTabs, FilterChipGroup } from "../../components/ui/Tabs";
import QuizCard from "../../components/student/QuizCard";
import { useEntitlements } from "../../hooks/useEntitlements";
import "./QuizzesPage.css";

const SUBJECT_TABS = [
  { key: "all", label: "All", icon: <LayoutGrid size={15} />, count: 147 },
  { key: "math", label: "Mathematics", dot: "var(--rr-violet-500)", count: 52 },
  { key: "physics", label: "Physics", dot: "var(--rr-cyan-500)", count: 38 },
  { key: "chem", label: "Chemistry", dot: "var(--rr-amber-500)", count: 32 },
  { key: "bio", label: "Biology", dot: "var(--rr-emerald-500)", count: 21 },
  { key: "mixed", label: "Mixed", icon: <Shuffle size={15} />, count: 4 },
  { key: "papers", label: "Previous papers", icon: <FileText size={15} />, count: 28 },
];

const DIFFICULTY_CHIPS = [
  { key: "any", label: "Any" },
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

const TIME_CHIPS = [
  { key: "any", label: "Any" },
  { key: "lt10", label: "< 10 min" },
  { key: "10-20", label: "10–20 min" },
  { key: "gt20", label: "> 20 min" },
];

const STATUS_CHIPS = [
  { key: "new", label: "New" },
  { key: "progress", label: "In progress" },
  { key: "done", label: "Completed" },
];

const QUIZZES = [
  { id: "1", subject: "math", topic: "Calculus · Differentiation", title: "Chain rule deep-dive — JEE-style", questionCount: 20, duration: "15 min", attempts: "1.2k attempts", difficulty: 3, status: "progress", progress: 60, cost: 1, statusText: "↻ In progress · 12 / 20" },
  { id: "2", subject: "physics", topic: "Mechanics · Rotational dynamics", title: "Torque, moment of inertia & conservation", questionCount: 22, duration: "18 min", attempts: "847 attempts", difficulty: 4, status: "new", cost: 1 },
  { id: "3", subject: "chem", topic: "Inorganic · Periodic table", title: "Periodicity of properties — block by block", questionCount: 20, duration: "10 min", attempts: "2.1k attempts", difficulty: 2, status: "done", cost: 1, statusText: "✓ Completed · 18 / 20" },
  { id: "4", subject: "math", topic: "Algebra · Quadratic equations", title: "Roots, discriminants, Vieta's formulas", questionCount: 18, duration: "12 min", attempts: "3.4k attempts", difficulty: 2, status: "new", cost: 1 },
  { id: "5", subject: "bio", topic: "Botany · Photosynthesis", title: "Light + dark reactions, C3 vs C4 plants", questionCount: 20, duration: "14 min", attempts: "912 attempts", difficulty: 3, status: "new", cost: 1 },
  { id: "6", subject: "physics", topic: "Thermodynamics · First law", title: "Heat, work, and the conservation of energy", questionCount: 20, duration: "16 min", attempts: "1.5k attempts", difficulty: 3, status: "new", cost: 1 },
  { id: "7", subject: "chem", topic: "Organic · Aldol condensation", title: "Aldol reactions — mechanism, products, conditions", questionCount: 24, duration: "20 min", attempts: "638 attempts", difficulty: 5, status: "new", cost: 1 },
  { id: "8", subject: "mixed", topic: "JEE Main · Mock test 04", title: "Full-length mock — 90 questions across PCM", questionCount: 90, duration: "3 hours", attempts: "4.2k attempts", difficulty: 4, status: "new", cost: 3, subjectLabel: "Mixed · PCM", paperType: "FULL_MOCK" },
  { id: "9", subject: "math", topic: "Trigonometry · Identities", title: "Sum-to-product & double-angle identities", questionCount: 20, duration: "10 min", attempts: "2.8k attempts", difficulty: 3, status: "done", cost: 1, statusText: "✓ Completed · 16 / 20" },
  { id: "10", subject: "physics", topic: "Optics · Wave optics", title: "Young's double-slit, interference patterns", questionCount: 18, duration: "14 min", attempts: "1.1k attempts", difficulty: 3, status: "new", cost: 1 },
  { id: "11", subject: "bio", topic: "Genetics · Mendel's laws", title: "Inheritance, dihybrid crosses, linkage", questionCount: 18, duration: "12 min", attempts: "734 attempts", difficulty: 2, status: "new", cost: 1 },
  { id: "12", subject: "chem", topic: "Physical · Chemical equilibrium", title: "Kc, Kp, Le Chatelier — quantitative drills", questionCount: 20, duration: "15 min", attempts: "1.8k attempts", difficulty: 3, status: "new", cost: 1 },
];

export default function QuizzesPage() {
  const [activeSubject, setActiveSubject] = useState("all");
  const [difficulty, setDifficulty] = useState("any");
  const [time, setTime] = useState("any");
  const [status, setStatus] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const { hasFeature, loading: entLoading } = useEntitlements();

  const resolveLock = (quiz) => {
    if (entLoading) return null;
    if (quiz.paperType === "FULL_MOCK" && !hasFeature("MOCK_TESTS")) {
      return "Full-length mock tests require Starter or Pro.";
    }
    if ((quiz.paperType === "PYQ" || quiz.subject === "papers") && !hasFeature("PYQ_ACCESS")) {
      return "Previous-year papers require Starter or Pro.";
    }
    return null;
  };

  return (
    <div className="main">
      {/* Page head */}
      <div className="page-head">
        <div>
          <div className="crumb">
            <Link to="/app">Home</Link> / Quizzes
          </div>
          <h1>Quizzes</h1>
          <p className="sub">
            147 quizzes calibrated to your class · 12 strong topics, 4 weak ones
            detected.
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-secondary">
            <Bookmark size={16} />
            My saved
          </button>
          <button className="btn btn-secondary">
            <History size={16} />
            History
          </button>
        </div>
      </div>

      {/* Subject tabs */}
      <SegmentedTabs
        items={SUBJECT_TABS}
        activeKey={activeSubject}
        onChange={setActiveSubject}
      />

      {/* Filter row */}
      <div className="filter-row">
        <FilterChipGroup
          label="Difficulty"
          items={DIFFICULTY_CHIPS}
          activeKey={difficulty}
          onChange={setDifficulty}
        />
        <div className="filter-divider" />
        <FilterChipGroup
          label="Time"
          items={TIME_CHIPS}
          activeKey={time}
          onChange={setTime}
        />
        <div className="filter-divider" />
        <FilterChipGroup
          label="Status"
          items={STATUS_CHIPS}
          activeKey={status}
          onChange={setStatus}
        />
        <div className="sort">
          <ArrowDownUp size={14} />
          Sort
          <select defaultValue="recommended">
            <option value="recommended">Recommended for you</option>
            <option value="popular">Most popular</option>
            <option value="newest">Newest first</option>
            <option value="hardest">Hardest first</option>
            <option value="shortest">Shortest first</option>
          </select>
        </div>
      </div>

      {/* Featured / Today's pick */}
      <div className="featured-card">
        <div>
          <span className="lbl">
            <Sparkles size={12} />★ Today's pick · suggested for you
          </span>
          <div className="topic" style={{ marginTop: 18 }}>
            Mathematics · Calculus · Chapter 5
          </div>
          <h2>Limits &amp; continuity — your weak-spot mop-up.</h2>
          <p className="desc">
            A 20-question set built from your two lowest-accuracy topics this
            week. Time-pressured, auto-graded, with explanations on every
            question once you finish.
          </p>
          <div className="meta-row">
            <span>
              <Clock size={13} />
              12 min
            </span>
            <span>
              <CircleCheck size={13} />
              20 questions
            </span>
            <span>
              <Zap size={13} />
              Hard · 3 of 5
            </span>
            <span>
              <TrendingUp size={13} />
              Avg. +12 ranks for top half
            </span>
          </div>
          <div className="cta-row">
            <Link to="/app/quizzes/featured/session" className="btn btn-lime btn-lg">
              <Play size={16} />
              Start quiz · 1 token
            </Link>
          </div>
        </div>
        <div className="featured-side">
          <div>
            <div className="lbl-small">Your last attempt · Calculus</div>
            <div className="stat-row" style={{ marginTop: 4 }}>
              <span className="big">14</span>
              <span className="small">/ 20 correct · 70%</span>
            </div>
          </div>
          <hr />
          <div>
            <div className="lbl-small">Class average · this quiz</div>
            <div className="stat-row" style={{ marginTop: 4 }}>
              <span className="big">11.4</span>
              <span className="small">/ 20 · 57%</span>
            </div>
          </div>
          <hr />
          <div>
            <div className="lbl-small">Expected rank delta</div>
            <div className="stat-row" style={{ marginTop: 4 }}>
              <span className="big lime">+18</span>
              <span className="small">if you score &gt; 16</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz grid section */}
      <div className="sec-title">
        <h2>All quizzes</h2>
        <div className="right">
          <span className="sub">Showing 1–12 of 147</span>
          <div className="view-toggle">
            <button
              className={viewMode === "grid" ? "on" : ""}
              title="Grid"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={viewMode === "list" ? "on" : ""}
              title="List"
              onClick={() => setViewMode("list")}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="quiz-grid">
        {QUIZZES.map((quiz) => (
          <QuizCard
            key={quiz.id}
            quizId={quiz.id}
            {...quiz}
            lockMessage={resolveLock(quiz)}
          />
        ))}
      </div>

      {/* Pager */}
      <div className="pager">
        <button title="Previous">
          <ArrowLeft size={14} />
        </button>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            className={currentPage === n ? "on" : ""}
            onClick={() => setCurrentPage(n)}
          >
            {n}
          </button>
        ))}
        <span className="ellipsis">…</span>
        <button onClick={() => setCurrentPage(13)}>13</button>
        <button title="Next">
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
