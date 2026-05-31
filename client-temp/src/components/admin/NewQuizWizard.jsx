import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, Loader2, Shuffle, X as XIcon, Calendar, Trophy } from "lucide-react";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import { quizzesAPI, questionsAPI } from "../../services/api";
import "./NewQuizWizard.css";

/**
 * 3-step admin "create quiz" wizard.
 *
 *   1. Audience  — examType + class(es)
 *   2. Questions — subject → chapter → optional topic/subtopic → filter →
 *                  auto-pick / manual pick
 *   3. Details   — title, description, time limit, toggles, tags, attempt
 *                  cost, rank-rewarding + contest window → submit
 *
 * Renders inside the shared <Modal size="xl">. Submits one POST that
 * creates a fully formed DRAFT including questions[] and (when on)
 * rank-rewarding + contest window — no "edit later" second step.
 */

const EXAM_TYPES = ["Boards", "JEE", "NEET"];
const BOARDS_CLASSES = ["8", "9", "10", "11", "12"];
const ENTRANCE_CLASSES = ["11", "12"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Expert"];
const QUESTION_TYPES = [
  { value: "MCQ", label: "MCQ" },
  { value: "MULTI_CORRECT", label: "Multi-correct" },
  { value: "ASSERTION_REASON", label: "Assertion-reason" },
  { value: "CASE_BASED", label: "Case-based" },
  { value: "MATCH_THE_FOLLOWING", label: "Match" },
  { value: "TRUE_FALSE", label: "True / false" },
  { value: "DIAGRAM_BASED", label: "Diagram-based" },
];
const FALLBACK_SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology"];

const unwrap = (res) => res?.data ?? res ?? null;

// Cache all-bank facets across opens — opening the wizard repeatedly
// shouldn't re-fetch the same big distinct-list.
let cachedAllFilters = null;

// datetime-local input wants `YYYY-MM-DDTHH:mm` in local time, no Z.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewQuizWizard({ open, onClose, onCreated, quiz }) {
  const isEdit = !!quiz;
  const [step, setStep] = useState(1);
  const [prefillLoading, setPrefillLoading] = useState(false);
  // In edit mode the existing questions have to keep showing in the Step-2
  // pool even when they don't match the current filters. We keep their full
  // data here and merge with the filtered candidatePool at render time.
  const [prefilledQuestions, setPrefilledQuestions] = useState([]);

  /* Step 1 — Audience */
  const [cohorts, setCohorts] = useState([]);

  /* Step 2 — Question picker */
  const [allFilters, setAllFilters] = useState(null);
  const [subject, setSubject] = useState("");
  const [examTypes, setExamTypes] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [pickedChapters, setPickedChapters] = useState([]);
  const [pickedDiffs, setPickedDiffs] = useState([]);
  const [pickedTypes, setPickedTypes] = useState([]);
  const [topicFilterOn, setTopicFilterOn] = useState(false);
  const [subTopicFilterOn, setSubTopicFilterOn] = useState(false);
  const [pickedTopics, setPickedTopics] = useState([]);
  const [pickedSubTopics, setPickedSubTopics] = useState([]);
  const [targetMins, setTargetMins] = useState(30);
  const [candidatePool, setCandidatePool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [autoPicking, setAutoPicking] = useState(false);

  /* Step 3 — Details */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMins, setTimeLimitMins] = useState(0);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [tagsInput, setTagsInput] = useState("");
  const [attemptCost, setAttemptCost] = useState(1);
  const [quizDifficulty, setQuizDifficulty] = useState("");
  const [rankRewarding, setRankRewarding] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ────────── lifecycle: reset on close / pre-fill on edit-open ────────── */
  useEffect(() => {
    if (!open) {
      // Hard reset everything on close so the next open is clean.
      setStep(1);
      setCohorts([]);
      setSubject(""); setExamTypes([]); setChapters([]); setPickedChapters([]);
      setPickedDiffs([]); setPickedTypes([]);
      setTopicFilterOn(false); setSubTopicFilterOn(false);
      setPickedTopics([]); setPickedSubTopics([]);
      setTargetMins(30); setCandidatePool([]); setSelectedIds([]);
      setPrefilledQuestions([]);
      setTitle(""); setDescription(""); setTimeLimitMins(0);
      setNegativeMarking(false); setShuffleQuestions(true);
      setTagsInput(""); setAttemptCost(1); setQuizDifficulty("");
      setRankRewarding(false); setStartsAt(""); setEndsAt("");
      setSubmitting(false);
      return;
    }
    if (!quiz) return; // create mode — leave defaults in place

    // Edit mode — pre-fill the form straight from the row data, then fetch
    // the full quiz to populate the question pool with their existing picks.
    let initialCohorts = quiz.cohort || [];
    if (initialCohorts.length === 0 && quiz.className) {
      initialCohorts = quiz.className.split(",").map(s => s.trim()).filter(Boolean);
    }
    setCohorts(initialCohorts);
    setExamTypes(quiz.examType || []);
    setSubject(quiz.subject || "");
    setTitle(quiz.title || "");
    setDescription(quiz.description || "");
    setTimeLimitMins(quiz.timeLimitMins ?? 60);
    setNegativeMarking(!!quiz.negativeMarking);
    setShuffleQuestions(quiz.shuffleQuestions !== false);
    setTagsInput(Array.isArray(quiz.tags) ? quiz.tags.join(", ") : "");
    setAttemptCost(quiz.attemptCost ?? 1);
    setQuizDifficulty(quiz.difficulty || "");
    setRankRewarding(!!quiz.rankRewarding);
    setStartsAt(toLocalInput(quiz.quizStartsAt));
    setEndsAt(toLocalInput(quiz.quizEndsAt));

    let cancelled = false;
    setPrefillLoading(true);
    quizzesAPI.getById(quiz.id)
      .then((res) => {
        if (cancelled) return;
        const full = unwrap(res)?.quiz;
        const existing = (full?.questions || [])
          .map((qq) => qq.questionData)
          .filter(Boolean);
        setPrefilledQuestions(existing);
        setSelectedIds(existing.map((q) => q.id));
        // Pre-pick the chapters the existing questions belong to so the
        // pool will load matching candidates when the user hits Step 2.
        const chs = Array.from(new Set(existing.map((q) => q.chapter).filter(Boolean)));
        setPickedChapters(chs);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPrefillLoading(false); });

    return () => { cancelled = true; };
  }, [open, quiz]);

  /* Step 2 entry → load subjects */
  useEffect(() => {
    if (!open || step !== 2) return;
    if (cachedAllFilters) { setAllFilters(cachedAllFilters); return; }
    questionsAPI.getFilters()
      .then((res) => { const d = unwrap(res) || {}; cachedAllFilters = d; setAllFilters(d); })
      .catch(() => {});
  }, [open, step]);

  const derivedClasses = useMemo(() => {
    const set = new Set();
    if (cohorts.includes("Dropper")) {
      set.add("11");
      set.add("12");
    }
    ["8", "9", "10", "11", "12"].forEach(c => {
      if (cohorts.includes(c)) set.add(c);
    });
    return Array.from(set);
  }, [cohorts]);

  /* Chapters when cohort/subject changes */
  useEffect(() => {
    if (step !== 2 || !subject) { setChapters([]); return; }
    let cancelled = false;
    const klass = derivedClasses[0];
    questionsAPI.getDynamicFilters({ examType: examTypes[0], class: klass, subject })
      .then((res) => {
        if (cancelled) return;
        const d = unwrap(res) || {};
        const list = Array.isArray(d.chapters) ? d.chapters.filter(Boolean) : [];
        setChapters(list);
        setPickedChapters((prev) => prev.filter((c) => list.includes(c)));
      })
      .catch(() => { if (!cancelled) setChapters([]); });
    return () => { cancelled = true; };
  }, [step, subject, examTypes, derivedClasses]);

  /* Question pool — fan out (class × chapter), merge, then client-side filter */
  const fetchPool = useCallback(async () => {
    if (!subject || pickedChapters.length === 0) {
      setCandidatePool([]);
      return;
    }
    setPoolLoading(true);
    try {
      const tasks = [];
      for (const klass of derivedClasses) {
        for (const ch of pickedChapters) {
          const eTypes = examTypes.length > 0 ? examTypes : [undefined];
          for (const et of eTypes) {
            tasks.push(questionsAPI.list({
              class: klass, chapter: ch, subject,
              ...(et ? { examType: et } : {}),
              status: "PUBLISHED", limit: 200,
              ...(pickedDiffs.length === 1 ? { difficulty: pickedDiffs[0] } : {}),
              ...(pickedTypes.length === 1 ? { questionType: pickedTypes[0] } : {}),
            }));
          }
        }
      }
      const results = await Promise.all(tasks.map((p) => p.catch(() => null)));
      const byId = new Map();
      for (const r of results) {
        const list = unwrap(r)?.questions || [];
        for (const q of list) if (!byId.has(q.id)) byId.set(q.id, q);
      }
      let pool = Array.from(byId.values());
      if (pickedDiffs.length > 1) pool = pool.filter((q) => pickedDiffs.includes(q.difficulty));
      if (pickedTypes.length > 1) pool = pool.filter((q) => pickedTypes.includes(q.questionType));
      setCandidatePool(pool);
      // Keep any selectedId that lives EITHER in the fresh pool or in the
      // pre-filled edit set — otherwise opening Edit and changing a filter
      // would silently un-select questions that were already on the quiz.
      const prefilledIds = new Set(prefilledQuestions.map((q) => q.id));
      setSelectedIds((prev) => prev.filter((id) => byId.has(id) || prefilledIds.has(id)));
    } finally {
      setPoolLoading(false);
    }
  }, [subject, pickedChapters, derivedClasses, examTypes, pickedDiffs, pickedTypes, prefilledQuestions]);

  useEffect(() => { if (step === 2) fetchPool(); }, [fetchPool, step]);

  // Cohort wipe is intentionally NOT an effect — when this was wired to
  // `useEffect(...[examType, classes])` it fired one render too late in
  // edit mode and clobbered the subject/chapters/questions the prefill
  // had just set. The wipe is now called from the user-driven cohort
  // handlers (resetCohortPicks), so prefill is never disturbed.
  const resetCohortPicks = () => {
    setSubject(""); setPickedChapters([]); setSelectedIds([]); setCandidatePool([]);
    setPickedTopics([]); setPickedSubTopics([]);
    setPrefilledQuestions([]);
  };

  /* Derived */
  const subjectOptions = useMemo(() => {
    const list = Array.isArray(allFilters?.subjects) ? allFilters.subjects.filter(Boolean) : [];
    return list.length ? list : FALLBACK_SUBJECTS;
  }, [allFilters]);

  // Merged pool = filtered candidates ∪ pre-existing edit-mode questions.
  // The latter always show so admins can see/unpick what's already on the
  // quiz even when their filter selection excludes them. Must be declared
  // BEFORE availableTopics / availableSubTopics / visiblePool — referencing
  // it before this point triggers a temporal-dead-zone ReferenceError that
  // crashes the entire page on render.
  const mergedPool = useMemo(() => {
    const byId = new Map();
    for (const q of prefilledQuestions) byId.set(q.id, q);
    for (const q of candidatePool) if (!byId.has(q.id)) byId.set(q.id, q);
    return Array.from(byId.values());
  }, [prefilledQuestions, candidatePool]);

  // Topic + subtopic chips derived from the merged pool — no extra server
  // calls. Picks beyond the visible set get pruned automatically.
  const availableTopics = useMemo(() => {
    const set = new Set();
    for (const q of mergedPool) if (q.topic) set.add(q.topic);
    return Array.from(set).sort();
  }, [mergedPool]);
  const availableSubTopics = useMemo(() => {
    const set = new Set();
    for (const q of mergedPool) {
      if (topicFilterOn && pickedTopics.length > 0 && !pickedTopics.includes(q.topic)) continue;
      if (q.subTopic) set.add(q.subTopic);
    }
    return Array.from(set).sort();
  }, [mergedPool, topicFilterOn, pickedTopics]);

  // Topic/subtopic filters are applied at render time over the merged pool.
  const visiblePool = useMemo(() => {
    return mergedPool.filter((q) => {
      if (topicFilterOn && pickedTopics.length > 0 && !pickedTopics.includes(q.topic)) return false;
      if (subTopicFilterOn && pickedSubTopics.length > 0 && !pickedSubTopics.includes(q.subTopic)) return false;
      return true;
    });
  }, [mergedPool, topicFilterOn, pickedTopics, subTopicFilterOn, pickedSubTopics]);

  const selectedQuestions = useMemo(() => {
    const byId = new Map(mergedPool.map((q) => [q.id, q]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean);
  }, [mergedPool, selectedIds]);

  const totalSecs = useMemo(
    () => selectedQuestions.reduce((s, q) => s + (q.estimatedTimeSeconds ?? 60), 0),
    [selectedQuestions],
  );

  // Auto-default time limit on first arrival at step 3.
  useEffect(() => {
    if (step !== 3 || timeLimitMins > 0) return;
    const mins = Math.max(5, Math.round(totalSecs / 60 / 5) * 5);
    setTimeLimitMins(mins);
  }, [step, totalSecs, timeLimitMins]);

  // Auto-default the quiz's overall difficulty from the picked questions:
  // most common difficulty among the selection. Falls back to "Medium" if
  // nothing's picked yet (unlikely on step 3 since the validity gate blocks).
  useEffect(() => {
    if (step !== 3 || quizDifficulty) return;
    const counts = new Map();
    for (const q of selectedQuestions) {
      const d = q.difficulty;
      if (d) counts.set(d, (counts.get(d) || 0) + 1);
    }
    let best = "Medium", bestN = 0;
    for (const [d, n] of counts) if (n > bestN) { best = d; bestN = n; }
    setQuizDifficulty(best);
  }, [step, selectedQuestions, quizDifficulty]);

  /* Handlers */
  const toggleInList = (list, val, setter) => {
    setter(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  };
  const toggleQuestion = (id) => {
    setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  const autoPick = () => {
    if (visiblePool.length === 0) {
      toast.error("No questions match those filters");
      return;
    }
    setAutoPicking(true);
    // Greedy: shuffle then accumulate by estimatedTimeSeconds until we'd
    // exceed the target. Allows fractional minutes (e.g. 3.5 → 210 s).
    const budget = Math.max(30, Math.round(targetMins * 60));
    const shuffled = [...visiblePool].sort(() => Math.random() - 0.5);
    const picked = [];
    let acc = 0;
    for (const q of shuffled) {
      const t = q.estimatedTimeSeconds ?? 60;
      if (acc + t <= budget) {
        picked.push(q.id);
        acc += t;
      }
      if (acc === budget) break;
    }
    setSelectedIds(picked);
    setAutoPicking(false);
    toast.success(`Picked ${picked.length} questions (~${(acc / 60).toFixed(1)} min)`);
  };

  const clearSelection = () => setSelectedIds([]);

  /* Step validity */
  const canAdvance = useMemo(() => {
    if (step === 1) return cohorts.length > 0;
    if (step === 2) return selectedIds.length > 0;
    if (step === 3) {
      if (!title.trim() || timeLimitMins <= 0) return false;
      if (rankRewarding) {
        // If a window is set, end must be after start.
        if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) return false;
      }
      return true;
    }
    return false;
  }, [step, cohorts, selectedIds, title, timeLimitMins, rankRewarding, startsAt, endsAt]);

  /* Submit */
  const submit = async () => {
    if (!canAdvance) return;
    setSubmitting(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        examType: examTypes,
        cohort: cohorts,
        className: derivedClasses.join(","),
        difficulty: quizDifficulty || (pickedDiffs.length === 1 ? pickedDiffs[0] : undefined),
        timeLimitMins: Math.max(1, Number(timeLimitMins) || 60),
        negativeMarking,
        shuffleQuestions,
        tags,
        attemptCost: Math.max(0, Number(attemptCost) || 0),
        rankRewarding,
        ...(rankRewarding && startsAt ? { quizStartsAt: new Date(startsAt).toISOString() } : {}),
        ...(rankRewarding && endsAt   ? { quizEndsAt:   new Date(endsAt).toISOString() }   : {}),
        questions: selectedQuestions.map((q, i) => ({
          questionId: q.id, order: i + 1, marks: q.marks ?? 1,
        })),
      };
      if (isEdit) {
        await quizzesAPI.update(quiz.id, payload);
        toast.success(`Saved · ${selectedQuestions.length} questions`);
      } else {
        await quizzesAPI.create(payload);
        toast.success(`Created · ${selectedQuestions.length} questions`);
      }
      onCreated?.();
    } catch (err) {
      toast.error(err?.message || (isEdit ? "Failed to save changes" : "Failed to create quiz"));
      setSubmitting(false);
    }
  };

  const stepTitles = ["Audience", "Questions", "Details"];

  const footer = (
    <>
      <button
        className="btn btn-secondary"
        onClick={step === 1 ? onClose : () => setStep((s) => s - 1)}
        disabled={submitting}
      >
        {step === 1 ? "Cancel" : "Back"}
      </button>
      {step < 3 ? (
        <button
          className="btn btn-accent"
          onClick={() => setStep((s) => s + 1)}
          disabled={!canAdvance || submitting}
        >
          Next
        </button>
      ) : (
        <button className="btn btn-accent" onClick={submit} disabled={!canAdvance || submitting}>
          {submitting
            ? <><Loader2 size={14} className="nqw-spin" /> {isEdit ? "Saving…" : "Creating…"}</>
            : (isEdit ? "Save changes" : "Create quiz")}
        </button>
      )}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={`${isEdit ? "Edit quiz" : "New quiz"} · ${stepTitles[step - 1]}`}
      footer={footer}
      size="xl"
    >
      <div className="nqw">
        {/* Step indicator */}
        <div className="nqw-steps">
          {[1, 2, 3].map((n, i) => (
            <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className={`nqw-step ${step === n ? "active" : step > n ? "done" : ""}`}>
                <span className="num">{step > n ? <Check size={12} strokeWidth={3} /> : n}</span>
                <span className="lbl">{stepTitles[i]}</span>
              </span>
              {n < 3 && <span className="nqw-step-divider" />}
            </span>
          ))}
        </div>

        {/* Persistent selection summary */}
        {step >= 2 && selectedQuestions.length > 0 && (
          <div className="nqw-summary">
            <div className="nqw-summary-col">
              <span className="lbl">Selected</span>
              <span className="v">
                {selectedQuestions.length}
                <small style={{ fontSize: 12, color: "var(--rr-fg-muted)", fontFamily: "var(--rr-font-sans)", marginLeft: 4 }}>
                  questions · ~{(totalSecs / 60).toFixed(1)} min
                </small>
              </span>
            </div>
            {step === 2 && (
              <div className="nqw-summary-actions">
                <button onClick={clearSelection}>Clear all</button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <Step1Audience
            cohorts={cohorts}
            setCohorts={(next) => { setCohorts(next); resetCohortPicks(); }}
          />
        )}

        {step === 2 && (
          <Step2Questions
            subjectOptions={subjectOptions}
            subject={subject} setSubject={setSubject}
            examTypes={examTypes}
            toggleExamType={(t) => toggleInList(examTypes, t, setExamTypes)}
            chapters={chapters}
            pickedChapters={pickedChapters}
            togglePickedChapter={(c) => toggleInList(pickedChapters, c, setPickedChapters)}
            pickedDiffs={pickedDiffs}
            togglePickedDiff={(d) => toggleInList(pickedDiffs, d, setPickedDiffs)}
            pickedTypes={pickedTypes}
            togglePickedType={(t) => toggleInList(pickedTypes, t, setPickedTypes)}
            topicFilterOn={topicFilterOn} setTopicFilterOn={setTopicFilterOn}
            subTopicFilterOn={subTopicFilterOn} setSubTopicFilterOn={setSubTopicFilterOn}
            availableTopics={availableTopics} pickedTopics={pickedTopics}
            togglePickedTopic={(t) => toggleInList(pickedTopics, t, setPickedTopics)}
            availableSubTopics={availableSubTopics} pickedSubTopics={pickedSubTopics}
            togglePickedSubTopic={(t) => toggleInList(pickedSubTopics, t, setPickedSubTopics)}
            targetMins={targetMins} setTargetMins={setTargetMins}
            autoPick={autoPick} autoPicking={autoPicking}
            pool={visiblePool} totalPool={candidatePool.length}
            poolLoading={poolLoading}
            selectedIds={selectedIds} toggleQuestion={toggleQuestion}
          />
        )}

        {step === 3 && (
          <Step3Details
            title={title} setTitle={setTitle}
            description={description} setDescription={setDescription}
            timeLimitMins={timeLimitMins} setTimeLimitMins={setTimeLimitMins}
            negativeMarking={negativeMarking} setNegativeMarking={setNegativeMarking}
            shuffleQuestions={shuffleQuestions} setShuffleQuestions={setShuffleQuestions}
            tagsInput={tagsInput} setTagsInput={setTagsInput}
            attemptCost={attemptCost} setAttemptCost={setAttemptCost}
            quizDifficulty={quizDifficulty} setQuizDifficulty={setQuizDifficulty}
            rankRewarding={rankRewarding} setRankRewarding={setRankRewarding}
            startsAt={startsAt} setStartsAt={setStartsAt}
            endsAt={endsAt} setEndsAt={setEndsAt}
            selectedCount={selectedQuestions.length}
            estimatedMins={(totalSecs / 60).toFixed(1)}
            isEdit={isEdit}
          />
        )}
      </div>
    </Modal>
  );
}

/* ───────────────────────────── Step 1 ───────────────────────────── */

function Step1Audience({ cohorts, setCohorts }) {
  const options = ["Dropper", "8", "9", "10", "11", "12"];

  const toggleCohort = (c) => {
    setCohorts(cohorts.includes(c) ? cohorts.filter((x) => x !== c) : [...cohorts, c]);
  };

  return (
    <div className="nqw-field">
      <span className="nqw-label">
        Cohorts <small>(pick one or more)</small>
      </span>
      <div className="nqw-chips">
        {options.map((c) => (
          <button
            key={c} type="button"
            className={`nqw-chip ${cohorts.includes(c) ? "on" : ""}`}
            onClick={() => toggleCohort(c)}
          >{c === "Dropper" ? "Dropper" : `Class ${c}`}</button>
        ))}
      </div>
      <p className="nqw-help">
        Select the target cohorts for this quiz. "Dropper" includes classes 11 and 12.
      </p>
    </div>
  );
}

/* ───────────────────────────── Step 2 ───────────────────────────── */

function Step2Questions(p) {
  return (
    <>
      <div className="nqw-row">
        <div className="nqw-field">
          <span className="nqw-label">Subject</span>
          {/* Portal-based custom Select — escapes the modal body's overflow
              so the dropdown isn't clipped or shown as the native browser UI. */}
          <Select
            value={p.subject}
            onChange={p.setSubject}
            placeholder="— pick a subject —"
            ariaLabel="Subject"
            options={p.subjectOptions.map((s) => ({ value: s, label: s }))}
          />
        </div>
      </div>

      {p.subject && (
        <>
          <div className="nqw-row" style={{ marginTop: 16 }}>
            <div className="nqw-field">
              <span className="nqw-label">Exam Type <small>(any if none)</small></span>
              <div className="nqw-chips">
                {EXAM_TYPES.map((t) => (
                  <button
                    key={t} type="button"
                    className={`nqw-chip ${p.examTypes.includes(t) ? "on" : ""}`}
                    onClick={() => p.toggleExamType(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="nqw-field">
            <span className="nqw-label">Chapters <small>(multi-select)</small></span>
            {p.chapters.length === 0 ? (
              <p className="nqw-help">
                {p.examTypes.length > 0 
                  ? "No questions there for this filter."
                  : "No chapters indexed for this cohort yet."}
              </p>
            ) : (
              <div className="nqw-chips">
                {p.chapters.map((c) => (
                  <button
                    key={c} type="button"
                    className={`nqw-chip ${p.pickedChapters.includes(c) ? "on" : ""}`}
                    onClick={() => p.togglePickedChapter(c)}
                  >{c}</button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {p.pickedChapters.length > 0 && (
        <>

          <div className="nqw-row">
            <div className="nqw-field">
              <span className="nqw-label">Difficulty <small>(any if none)</small></span>
              <div className="nqw-chips">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d} type="button"
                    className={`nqw-chip ${p.pickedDiffs.includes(d) ? "on" : ""}`}
                    onClick={() => p.togglePickedDiff(d)}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="nqw-field">
            <span className="nqw-label">Question types <small>(any if none)</small></span>
            <div className="nqw-chips">
              {QUESTION_TYPES.map((t) => (
                <button
                  key={t.value} type="button"
                  className={`nqw-chip ${p.pickedTypes.includes(t.value) ? "on" : ""}`}
                  onClick={() => p.togglePickedType(t.value)}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Optional topic + subtopic narrowing. Derived from the loaded
              pool client-side so it's instant after the initial fetch. */}
          <div className="nqw-row">
            <label
              className={`nqw-toggle ${p.topicFilterOn ? "on" : ""}`}
              onClick={() => p.setTopicFilterOn((v) => !v)}
              role="checkbox" aria-checked={p.topicFilterOn}
            >
              <div className="label">
                <span className="t">Filter by topic</span>
                <span className="h">Narrow within a chapter</span>
              </div>
              <span className="switch" />
            </label>
            <label
              className={`nqw-toggle ${p.subTopicFilterOn ? "on" : ""}`}
              onClick={() => p.setSubTopicFilterOn((v) => !v)}
              role="checkbox" aria-checked={p.subTopicFilterOn}
            >
              <div className="label">
                <span className="t">Filter by subtopic</span>
                <span className="h">Finer than a topic</span>
              </div>
              <span className="switch" />
            </label>
          </div>

          {p.topicFilterOn && (
            <div className="nqw-field">
              <span className="nqw-label">Topics <small>({p.availableTopics.length} available)</small></span>
              {p.availableTopics.length === 0 ? (
                <p className="nqw-help">No topics tagged on questions in the current pool.</p>
              ) : (
                <div className="nqw-chips">
                  {p.availableTopics.map((t) => (
                    <button
                      key={t} type="button"
                      className={`nqw-chip ${p.pickedTopics.includes(t) ? "on" : ""}`}
                      onClick={() => p.togglePickedTopic(t)}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {p.subTopicFilterOn && (
            <div className="nqw-field">
              <span className="nqw-label">Subtopics <small>({p.availableSubTopics.length} available)</small></span>
              {p.availableSubTopics.length === 0 ? (
                <p className="nqw-help">No subtopics tagged on questions in the current pool.</p>
              ) : (
                <div className="nqw-chips">
                  {p.availableSubTopics.map((t) => (
                    <button
                      key={t} type="button"
                      className={`nqw-chip ${p.pickedSubTopics.includes(t) ? "on" : ""}`}
                      onClick={() => p.togglePickedSubTopic(t)}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="nqw-autopick">
            <div className="nqw-field">
              <span className="nqw-label">Auto-pick · target minutes <small>(decimals OK)</small></span>
              <input
                className="nqw-input"
                type="number" min={0.5} step={0.5}
                value={targetForInput(p.targetMins)}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  p.setTargetMins(Number.isFinite(n) && n > 0 ? n : 0.5);
                }}
              />
            </div>
            <button onClick={p.autoPick} disabled={p.autoPicking || p.pool.length === 0}>
              {p.autoPicking ? <Loader2 size={14} className="nqw-spin" /> : <Shuffle size={14} />}
              Auto-pick
            </button>
          </div>

          <div className="nqw-field">
            <span className="nqw-label">
              Question pool
              <small>
                {" · "}
                {p.poolLoading ? "loading…" : `${p.pool.length} shown`}
                {p.totalPool !== p.pool.length ? ` of ${p.totalPool} loaded` : ""}
              </small>
            </span>
            <div className="nqw-qlist">
              {p.poolLoading ? (
                <div className="nqw-qlist-empty">Loading…</div>
              ) : p.pool.length === 0 ? (
                <div className="nqw-qlist-empty">No questions match the current filters.</div>
              ) : (
                p.pool.map((q) => {
                  const picked = p.selectedIds.includes(q.id);
                  const diffClass = `diff-${(q.difficulty || "").toLowerCase()}`;
                  return (
                    <div
                      key={q.id}
                      className={`nqw-qrow ${picked ? "picked" : ""}`}
                      onClick={() => p.toggleQuestion(q.id)}
                    >
                      <span className="check"><Check size={12} strokeWidth={3} /></span>
                      <div className="text">
                        <span className="title">{q.question || q.questionId || "(no title)"}</span>
                        <span className="meta">
                          {q.questionType?.replace(/_/g, " ").toLowerCase()} · {q.chapter || "no chapter"}
                          {q.topic ? ` › ${q.topic}` : ""}
                          {q.subTopic ? ` › ${q.subTopic}` : ""}
                          {" · "}{q.marks ?? 1} mark{(q.marks ?? 1) === 1 ? "" : "s"}
                        </span>
                      </div>
                      <span className={`badge ${diffClass}`}>{q.difficulty || "—"}</span>
                      <span className="secs">{q.estimatedTimeSeconds ?? 60}s</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Keep the input text in sync with the numeric state; show whole numbers
// without trailing ".0" so 30 looks like 30, not 30.0.
function targetForInput(n) {
  if (n == null) return "";
  return Number.isInteger(n) ? String(n) : String(n);
}

/* ───────────────────────────── Step 3 ───────────────────────────── */

function Step3Details(p) {
  const windowError = p.rankRewarding && p.startsAt && p.endsAt && new Date(p.startsAt) >= new Date(p.endsAt);
  return (
    <>
      <div className="nqw-field">
        <span className="nqw-label">Title</span>
        <input
          className="nqw-input" type="text"
          placeholder="e.g. Calculus — Limits & continuity"
          value={p.title} onChange={(e) => p.setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="nqw-field">
        <span className="nqw-label">Description <small>(optional)</small></span>
        <textarea
          className="nqw-textarea" rows={3}
          placeholder="One-line summary that students will see on the quiz card."
          value={p.description} onChange={(e) => p.setDescription(e.target.value)}
        />
      </div>

      <div className="nqw-field">
        <span className="nqw-label">
          Difficulty <small>(quiz-level rating shown to students · pre-selected from picked questions)</small>
        </span>
        <div className="nqw-chips">
          {DIFFICULTIES.map((d) => (
            <button
              key={d} type="button"
              className={`nqw-chip ${p.quizDifficulty === d ? "on" : ""}`}
              onClick={() => p.setQuizDifficulty(d)}
            >{d}</button>
          ))}
        </div>
      </div>

      <div className="nqw-row">
        <div className="nqw-field">
          <span className="nqw-label">
            Time limit <small>(minutes · est. {p.estimatedMins} min)</small>
          </span>
          <input
            className="nqw-input" type="number" min={0.5} step={0.5}
            value={targetForInput(p.timeLimitMins)}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              p.setTimeLimitMins(Number.isFinite(n) && n > 0 ? n : 0);
            }}
          />
        </div>
        <div className="nqw-field">
          <span className="nqw-label">Attempt cost <small>(tokens · 0 = free)</small></span>
          <input
            className="nqw-input" type="number" min={0} step={1}
            value={p.attemptCost}
            onChange={(e) => p.setAttemptCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
        </div>
      </div>

      <div className="nqw-field">
        <span className="nqw-label">Tags <small>(comma-separated)</small></span>
        <input
          className="nqw-input" type="text"
          placeholder="e.g. PYQ, JEE-Main, conceptual"
          value={p.tagsInput} onChange={(e) => p.setTagsInput(e.target.value)}
        />
      </div>

      <div className="nqw-row">
        <label
          className={`nqw-toggle ${p.negativeMarking ? "on" : ""}`}
          onClick={() => p.setNegativeMarking((v) => !v)}
          role="checkbox" aria-checked={p.negativeMarking}
        >
          <div className="label">
            <span className="t">Negative marking</span>
            <span className="h">Deduct marks for wrong answers</span>
          </div>
          <span className="switch" />
        </label>
        <label
          className={`nqw-toggle ${p.shuffleQuestions ? "on" : ""}`}
          onClick={() => p.setShuffleQuestions((v) => !v)}
          role="checkbox" aria-checked={p.shuffleQuestions}
        >
          <div className="label">
            <span className="t">Shuffle questions</span>
            <span className="h">Each student sees a different order</span>
          </div>
          <span className="switch" />
        </label>
      </div>

      <label
        className={`nqw-toggle ${p.rankRewarding ? "on" : ""}`}
        onClick={() => p.setRankRewarding((v) => !v)}
        role="checkbox" aria-checked={p.rankRewarding}
      >
        <div className="label">
          <span className="t" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Trophy size={13} /> Rank-rewarding contest
          </span>
          <span className="h">Counts toward global rank · adds a per-quiz leaderboard</span>
        </div>
        <span className="switch" />
      </label>

      {p.rankRewarding && (
        <div className="nqw-row">
          <div className="nqw-field">
            <span className="nqw-label">
              <Calendar size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              Starts at <small>(optional)</small>
            </span>
            <input
              className="nqw-input" type="datetime-local"
              value={p.startsAt} onChange={(e) => p.setStartsAt(e.target.value)}
            />
          </div>
          <div className="nqw-field">
            <span className="nqw-label">
              <Calendar size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              Ends at <small>(optional · auto-closes leaderboard)</small>
            </span>
            <input
              className="nqw-input" type="datetime-local"
              value={p.endsAt} onChange={(e) => p.setEndsAt(e.target.value)}
              min={p.startsAt || undefined}
            />
          </div>
        </div>
      )}
      {windowError && (
        <p className="nqw-help" style={{ color: "var(--rr-coral-500)" }}>
          End time must be after start time.
        </p>
      )}

      <p className="nqw-help">
        {p.isEdit
          ? <>Saves changes to this quiz · {p.selectedCount} question{p.selectedCount === 1 ? "" : "s"}.</>
          : <>Will save as <b style={{ color: "var(--rr-fg)" }}>Draft</b> with {p.selectedCount} question{p.selectedCount === 1 ? "" : "s"}.  You can publish from the row's status switch.</>}
      </p>
    </>
  );
}
