import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, X, Clock, Award, BookOpen, Check, Filter, ChevronDown, ChevronRight, Wand2, Loader2, Sparkles, GraduationCap, Layers, FileText, Shuffle } from 'lucide-react';
import Button from '../common/Button';
import { quizzesAPI, questionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { DIFFICULTY_COLORS, TYPE_LABELS, QUESTION_TYPES } from '../../utils/constants';
import { cn } from '../../utils/cn';

const EXAM_TYPES = [
  { value: 'CBSE', label: 'CBSE', icon: '📘', description: 'Select individual class' },
  { value: 'NEET', label: 'NEET', icon: '🧬', description: 'Class 11 & 12' },
  { value: 'JEE', label: 'JEE', icon: '⚡', description: 'Class 11 & 12' },
];

const CLASS_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

export default function QuizBuilderModal({ isOpen, onClose, onSuccess, initialQuiz = null }) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Progressive Filter State
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapters, setSelectedChapters] = useState([]);

  // Dynamic Options (fetched based on upstream selections)
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableChapters, setAvailableChapters] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [filterStats, setFilterStats] = useState({ totalQuestions: 0 });

  // Question-level filters (only non-redundant ones)
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Randomizer State
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [targetMarks, setTargetMarks] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLog, setGenerationLog] = useState('');

  // Time Limit Override State
  const [manualTimeLimit, setManualTimeLimit] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);

  // Quiz Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'Medium',
    tags: '',
  });

  // Selected Questions Map: id -> question data
  const [selectedQuestions, setSelectedQuestions] = useState(new Map());

  // Determine if class selection is manual (CBSE) vs auto (NEET/JEE)
  const isAutoClassExam = selectedExamType === 'NEET' || selectedExamType === 'JEE';

  // Reset downstream when upstream changes
  useEffect(() => {
    if (isOpen && !initialQuiz) {
      setSelectedClasses([]);
      setSelectedSubject('');
      setSelectedChapters([]);
      setAvailableSubjects([]);
      setAvailableChapters([]);
    }
  }, [selectedExamType]);

  useEffect(() => {
    if (!initialQuiz) {
      setSelectedSubject('');
      setSelectedChapters([]);
      setAvailableChapters([]);
    }
  }, [selectedClasses.join(',')]);

  useEffect(() => {
    if (!initialQuiz) {
      setSelectedChapters([]);
    }
  }, [selectedSubject]);

  // Auto-set classes for NEET/JEE
  useEffect(() => {
    if (isAutoClassExam) {
      setSelectedClasses(['11', '12']);
    }
  }, [isAutoClassExam]);

  // Fetch available subjects when exam type + class are set
  useEffect(() => {
    if (selectedExamType && selectedClasses.length > 0) {
      fetchDynamicOptions({ examType: selectedExamType, class: selectedClasses.join(',') });
    }
  }, [selectedExamType, selectedClasses.join(',')]);

  // Fetch available chapters when subject is also set
  useEffect(() => {
    if (selectedExamType && selectedClasses.length > 0 && selectedSubject) {
      fetchDynamicOptions({
        examType: selectedExamType,
        class: selectedClasses.join(','),
        subject: selectedSubject,
      });
    }
  }, [selectedSubject]);

  // Load questions when all primary filters are set
  useEffect(() => {
    if (isOpen && selectedExamType && selectedClasses.length > 0 && selectedSubject) {
      loadQuestions();
    }
  }, [isOpen, selectedExamType, selectedClasses.join(','), selectedSubject, selectedChapters.join(','), difficultyFilter, typeFilter]);

  // Initialize form from existing quiz
  useEffect(() => {
    if (isOpen) {
      if (initialQuiz) {
        setFormData({
          title: initialQuiz.title || '',
          description: initialQuiz.description || '',
          difficulty: initialQuiz.difficulty || 'Medium',
          tags: (initialQuiz.tags || []).join(', '),
        });
        setSelectedExamType((initialQuiz.examType || [])[0] || '');
        setSelectedSubject(initialQuiz.subject || '');
        if (initialQuiz.className) {
          setSelectedClasses(initialQuiz.className.split(',').map(c => c.trim()));
        }
        const initialSelected = new Map();
        if (initialQuiz.questions && Array.isArray(initialQuiz.questions)) {
          initialQuiz.questions.forEach(q => {
            if (q.questionData) {
              initialSelected.set(q.questionId, { ...q.questionData, _id: q.questionData.id || q.questionId, selectedMarks: q.marks });
            }
          });
        }
        setSelectedQuestions(initialSelected);
        setShuffleQuestions(initialQuiz.shuffleQuestions || false);
      } else {
        setFormData({ title: '', description: '', difficulty: 'Medium', tags: '' });
        setSelectedExamType('');
        setSelectedClasses([]);
        setSelectedSubject('');
        setSelectedChapters([]);
        setSelectedQuestions(new Map());
        setDifficultyFilter('');
        setTypeFilter('');
        setSearch('');
        setManualTimeLimit('');
        setShuffleQuestions(false);
      }
    }
  }, [isOpen, initialQuiz]);

  // Fetch initial filter data on open
  useEffect(() => {
    if (isOpen) {
      loadInitialFilters();
    }
  }, [isOpen]);

  const loadInitialFilters = async () => {
    try {
      const res = await questionsAPI.getFilters();
      const data = res.data || {};
      setAvailableClasses(data.classes || []);
    } catch (err) {
      console.error('Failed to load initial filters');
    }
  };

  const fetchDynamicOptions = async (params) => {
    try {
      const res = await questionsAPI.getDynamicFilters(params);
      const data = res.data || {};
      setAvailableSubjects(data.subjects || []);
      setAvailableChapters(data.chapters || []);
      setFilterStats({ totalQuestions: data.totalQuestions || 0 });
      if (params.subject) {
        setAvailableChapters(data.chapters || []);
      }
    } catch (err) {
      console.error('Failed to load dynamic filters');
    }
  };

  const loadQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const params = {
        limit: 200,
        status: 'PUBLISHED',
        examType: selectedExamType,
        subject: selectedSubject,
      };
      if (selectedClasses.length === 1) {
        params.class = selectedClasses[0];
      }
      if (selectedChapters.length > 0 && selectedChapters.length < availableChapters.length) {
        params.chapter = selectedChapters[0];
      }
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (typeFilter) params.questionType = typeFilter;

      const res = await questionsAPI.getAll(params);
      let allQuestions = res.data.questions || [];

      // Client-side filter for multiple classes/chapters since API supports single values
      if (selectedClasses.length > 1) {
        allQuestions = allQuestions.filter(q => selectedClasses.includes(q.class));
      }
      if (selectedChapters.length > 0) {
        allQuestions = allQuestions.filter(q => selectedChapters.includes(q.chapter));
      }

      setQuestions(allQuestions);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSelectQuestion = (q) => {
    setSelectedQuestions(prev => {
      const next = new Map(prev);
      if (next.has(q._id)) {
        next.delete(q._id);
      } else {
        next.set(q._id, q);
      }
      return next;
    });
  };

  const calculateTotals = useMemo(() => {
    let totalMarks = 0;
    let totalSeconds = 0;
    let hasNegativeMarking = false;
    selectedQuestions.forEach(q => {
      totalMarks += (q.selectedMarks || q.marks || 1);
      totalSeconds += (q.estimatedTimeSeconds || 60);
      if (q.negativeMarks && q.negativeMarks > 0) hasNegativeMarking = true;
    });

    const roundedSeconds = Math.round(totalSeconds / 30) * 30;
    const autoMins = roundedSeconds / 60;

    return {
      marks: totalMarks,
      hasNegativeMarking,
      timeLimitMins: manualTimeLimit !== '' ? parseFloat(manualTimeLimit) : (autoMins > 0 ? autoMins : 0)
    };
  }, [selectedQuestions, manualTimeLimit]);

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    if (selectedQuestions.size === 0) {
      toast.error('Please select at least one question');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        subject: selectedSubject,
        difficulty: formData.difficulty,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        className: selectedClasses.join(', '),
        examType: [selectedExamType].filter(Boolean),
        timeLimitMins: calculateTotals.timeLimitMins,
        negativeMarking: calculateTotals.hasNegativeMarking,
        shuffleQuestions,
        questions: Array.from(selectedQuestions.values()).map((q, i) => ({
          questionId: q._id || q.id,
          order: i + 1,
          marks: q.selectedMarks || q.marks || 1
        }))
      };

      if (initialQuiz) {
        await quizzesAPI.update(initialQuiz._id, payload);
        toast.success('Quiz updated successfully');
      } else {
        await quizzesAPI.create(payload);
        toast.success('Quiz created successfully');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q =>
      !search || (
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        q.chapter.toLowerCase().includes(search.toLowerCase()) ||
        q.topic?.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [questions, search]);

  const handleRandomize = async () => {
    if (!targetMarks || isNaN(targetMarks) || Number(targetMarks) <= 0) {
      toast.error('Please enter a valid target max marks');
      return;
    }

    const target = Number(targetMarks);
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationLog('Analyzing criteria & applying filters...');

    await new Promise(r => setTimeout(r, 400));
    setGenerationProgress(30);
    setGenerationLog('Fetching matching questions from bank...');

    const pool = [...filteredQuestions];
    if (pool.length === 0) {
      toast.error('No questions match the current criteria');
      setIsGenerating(false);
      return;
    }

    await new Promise(r => setTimeout(r, 500));
    setGenerationProgress(60);
    setGenerationLog('Shuffling and optimizing question selection...');

    const shuffled = pool.sort(() => Math.random() - 0.5);
    const nextSelected = new Map();

    let currentMarks = 0;
    for (const q of shuffled) {
      if (currentMarks >= target) break;
      nextSelected.set(q._id, q);
      currentMarks += (q.selectedMarks || q.marks || 1);
    }

    await new Promise(r => setTimeout(r, 600));
    setGenerationProgress(85);
    setGenerationLog('Finalizing quiz structure & smart defaults...');

    setSelectedQuestions(nextSelected);
    setManualTimeLimit('');

    await new Promise(r => setTimeout(r, 400));
    setGenerationProgress(100);
    setGenerationLog('Complete!');

    setTimeout(() => {
      setIsGenerating(false);
      if (currentMarks < target) {
        toast.success(`Generated with ${currentMarks} marks (Not enough matching questions for ${target})`);
      } else {
        toast.success(`Successfully generated quiz with ${currentMarks} marks!`);
      }
      setShowRandomizer(false);
    }, 600);
  };

  const handleToggleChapter = (chapter) => {
    setSelectedChapters(prev =>
      prev.includes(chapter) ? prev.filter(c => c !== chapter) : [...prev, chapter]
    );
  };

  const handleSelectAllChapters = () => {
    if (selectedChapters.length === availableChapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters([...availableChapters]);
    }
  };

  const handleClassToggle = (cls) => {
    if (isAutoClassExam) return;
    setSelectedClasses(prev =>
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  // Derived state: can show questions
  const canShowQuestions = selectedExamType && selectedClasses.length > 0 && selectedSubject;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-dark-950/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-6xl h-[90vh] flex flex-col glass-card rounded-2xl overflow-hidden glow-accent inner-shine"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {initialQuiz ? 'Edit Quiz' : 'Create New Quiz'}
                </h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-dark-300">
                  <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-amber-400" /> {calculateTotals.marks} Marks</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-neon-cyan" /> {calculateTotals.timeLimitMins} Mins</span>
                  <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-accent-400" /> {selectedQuestions.size} Questions</span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="rounded-xl p-2 text-dark-300 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <X className="h-5 w-5" />
              </motion.button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Panel: Progressive Filters + Quiz Details */}
              <div className="w-[340px] border-r border-white/[0.04] overflow-y-auto">
                {/* Progressive Filter Flow */}
                <div className="p-5 space-y-5">
                  {/* Step 1: Exam Type */}
                  <div>
                    <label className="block text-[10px] font-semibold text-accent-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3" /> Step 1 — Exam Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {EXAM_TYPES.map(exam => (
                        <button
                          key={exam.value}
                          onClick={() => setSelectedExamType(exam.value)}
                          className={cn(
                            "flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 text-center",
                            selectedExamType === exam.value
                              ? "bg-accent-500/15 border-accent-500/40 text-white shadow-sm shadow-accent-500/10"
                              : "glass-frosted border-transparent hover:border-white/10 text-dark-300 hover:text-white"
                          )}
                        >
                          <span className="text-lg">{exam.icon}</span>
                          <span className="text-xs font-semibold">{exam.label}</span>
                        </button>
                      ))}
                    </div>
                    {selectedExamType && (
                      <p className="mt-1.5 text-[10px] text-dark-400">
                        {EXAM_TYPES.find(e => e.value === selectedExamType)?.description}
                      </p>
                    )}
                  </div>

                  {/* Step 2: Class Selection */}
                  <AnimatePresence>
                    {selectedExamType && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <label className="block text-[10px] font-semibold text-accent-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3 h-3" /> Step 2 — Class
                        </label>
                        {isAutoClassExam ? (
                          <div className="flex gap-2">
                            {['11', '12'].map(cls => (
                              <div key={cls} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-500/10 border border-accent-500/30 text-white text-xs font-medium">
                                <Check className="w-3 h-3 text-accent-400" />
                                Class {cls}
                              </div>
                            ))}
                            <span className="self-center text-[10px] text-dark-400 ml-1">(Auto-applied)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {CLASS_OPTIONS.map(cls => (
                              <button
                                key={cls}
                                onClick={() => handleClassToggle(cls)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                  selectedClasses.includes(cls)
                                    ? "bg-accent-500/15 border-accent-500/40 text-white"
                                    : "glass-frosted border-transparent hover:border-white/10 text-dark-300 hover:text-white"
                                )}
                              >
                                {cls}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Step 3: Subject Selection */}
                  <AnimatePresence>
                    {selectedExamType && selectedClasses.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <label className="block text-[10px] font-semibold text-accent-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3" /> Step 3 — Subject
                        </label>
                        {availableSubjects.length === 0 ? (
                          <p className="text-xs text-dark-400 italic">No subjects found for this combination.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {availableSubjects.map(subj => (
                              <button
                                key={subj}
                                onClick={() => setSelectedSubject(subj)}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                                  selectedSubject === subj
                                    ? "bg-accent-500/15 border-accent-500/40 text-white"
                                    : "glass-frosted border-transparent hover:border-white/10 text-dark-300 hover:text-white"
                                )}
                              >
                                {subj}
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Step 4: Chapter Selection */}
                  <AnimatePresence>
                    {selectedSubject && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-semibold text-accent-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3 h-3" /> Step 4 — Chapters
                          </label>
                          {availableChapters.length > 0 && (
                            <button
                              onClick={handleSelectAllChapters}
                              className="text-[10px] text-accent-400 hover:text-accent-300 font-medium transition-colors"
                            >
                              {selectedChapters.length === availableChapters.length ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>
                        {availableChapters.length === 0 ? (
                          <p className="text-xs text-dark-400 italic">No chapters found.</p>
                        ) : (
                          <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                            {availableChapters.map(ch => (
                              <button
                                key={ch}
                                onClick={() => handleToggleChapter(ch)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left border transition-all duration-200",
                                  selectedChapters.includes(ch)
                                    ? "bg-accent-500/10 border-accent-500/30 text-white"
                                    : "border-transparent hover:bg-white/[0.03] text-dark-300 hover:text-white"
                                )}
                              >
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded flex items-center justify-center border flex-shrink-0",
                                  selectedChapters.includes(ch) ? "bg-accent-500 border-accent-500" : "border-dark-500"
                                )}>
                                  {selectedChapters.includes(ch) && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="truncate">{ch}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedChapters.length > 0 && (
                          <p className="mt-1.5 text-[10px] text-dark-400">
                            {selectedChapters.length} of {availableChapters.length} chapters selected
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Divider */}
                  {canShowQuestions && (
                    <div className="border-t border-white/[0.04] pt-4 space-y-3">
                      <label className="block text-[10px] font-semibold text-dark-400 uppercase tracking-wider">Quiz Details</label>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase">Title *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Weekly Physics Mock Test"
                          className="w-full rounded-xl glass-input px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Optional description..."
                          rows={2}
                          className="w-full rounded-xl glass-input px-3 py-2 text-sm text-white focus:outline-none resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase">Difficulty</label>
                          <select
                            value={formData.difficulty}
                            onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                            className="w-full appearance-none rounded-lg glass-input px-3 py-1.5 text-xs text-white focus:outline-none"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                            <option value="Expert">Expert</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase flex items-center justify-between">
                            <span>Time (mins)</span>
                            {manualTimeLimit !== '' && (
                              <button onClick={() => setManualTimeLimit('')} className="text-accent-500 hover:text-accent-400 normal-case">Auto</button>
                            )}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={manualTimeLimit !== '' ? manualTimeLimit : calculateTotals.timeLimitMins}
                            onChange={e => setManualTimeLimit(e.target.value)}
                            className={cn("w-full rounded-lg glass-input px-3 py-1.5 text-xs focus:outline-none", manualTimeLimit === '' ? "text-dark-300" : "text-white")}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase">Tags (comma separated)</label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={e => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="e.g. mock, weekly"
                          className="w-full rounded-lg glass-input px-3 py-1.5 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShuffleQuestions(prev => !prev)}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg border transition-all duration-200 text-xs font-medium",
                          shuffleQuestions
                            ? "bg-accent-500/15 border-accent-500/40 text-white"
                            : "glass-frosted border-transparent hover:border-white/10 text-dark-300 hover:text-white"
                        )}
                      >
                        <Shuffle className={cn("w-3.5 h-3.5", shuffleQuestions ? "text-accent-400" : "text-dark-500")} />
                        Shuffle Questions
                        <div className={cn(
                          "ml-auto w-7 h-4 rounded-full transition-all duration-200 relative",
                          shuffleQuestions ? "bg-accent-500" : "bg-dark-600"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200",
                            shuffleQuestions ? "left-3.5" : "left-0.5"
                          )} />
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Question Selection */}
              <div className="flex-1 flex flex-col bg-dark-950/30">
                {!canShowQuestions ? (
                  <div className="flex-1 flex items-center justify-center p-10">
                    <div className="text-center max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto mb-4">
                        <Filter className="w-7 h-7 text-accent-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Select Filters to Begin</h3>
                      <p className="text-sm text-dark-400">
                        Choose an exam type, class, and subject from the left panel to load matching questions.
                      </p>
                      <div className="mt-6 flex flex-col gap-2 text-left mx-auto max-w-[240px]">
                        <StepIndicator step={1} label="Exam Type" done={!!selectedExamType} />
                        <StepIndicator step={2} label="Class" done={selectedClasses.length > 0} />
                        <StepIndicator step={3} label="Subject" done={!!selectedSubject} />
                        <StepIndicator step={4} label="Chapters (optional)" done={selectedChapters.length > 0} optional />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Search + Actions Bar */}
                    <div className="p-4 border-b border-white/[0.04]">
                      <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search questions..."
                            className="w-full rounded-xl glass-input pl-10 pr-4 py-2 text-sm text-white focus:outline-none"
                          />
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setShowRandomizer(!showRandomizer)}>
                          <Wand2 className="h-4 w-4" />
                          Auto Generate
                        </Button>
                      </div>

                      {/* Refined Filters (only non-redundant) */}
                      <div className="flex items-center gap-2">
                        <MiniFilter
                          label="Difficulty"
                          value={difficultyFilter}
                          onChange={setDifficultyFilter}
                          options={['Easy', 'Medium', 'Hard', 'Expert']}
                        />
                        <MiniFilter
                          label="Type"
                          value={typeFilter}
                          onChange={setTypeFilter}
                          options={Object.keys(QUESTION_TYPES).map(k => QUESTION_TYPES[k])}
                          displayMap={TYPE_LABELS}
                        />
                        <span className="ml-auto text-[10px] text-dark-400 font-medium">
                          {filteredQuestions.length} questions available
                        </span>
                      </div>
                    </div>

                    {/* Auto Generate Panel */}
                    <AnimatePresence>
                      {showRandomizer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-b border-white/[0.04]"
                        >
                          <div className="p-4 bg-accent-500/[0.03] relative overflow-hidden">
                            {isGenerating && (
                              <motion.div
                                className="absolute inset-0 bg-accent-500/10"
                                animate={{ opacity: [0.2, 0.5, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                            <div className="relative z-10">
                              <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="h-4 w-4 text-accent-400" />
                                <h3 className="text-sm font-semibold text-white">Auto Quiz Generator</h3>
                              </div>
                              {!isGenerating ? (
                                <div className="flex items-end gap-3">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase">Target Max Marks *</label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={targetMarks}
                                      onChange={(e) => setTargetMarks(e.target.value)}
                                      placeholder="e.g. 50"
                                      className="w-full rounded-lg glass-input px-3 py-1.5 text-sm text-white focus:outline-none"
                                    />
                                  </div>
                                  <Button size="sm" onClick={handleRandomize} disabled={!targetMarks}>
                                    <Wand2 className="h-4 w-4" />
                                    Generate
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs font-medium">
                                    <span className="text-accent-400 flex items-center gap-2">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      {generationLog}
                                    </span>
                                    <span className="text-white">{generationProgress}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-accent-500 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${generationProgress}%` }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Question List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {questionsLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-xl glass-frosted animate-pulse" />
                          ))}
                        </div>
                      ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-16 text-dark-400 text-sm">
                          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p>No questions found matching your filters.</p>
                          <p className="text-[10px] mt-1">Try adjusting your chapter selection or search query.</p>
                        </div>
                      ) : (
                        filteredQuestions.map(q => {
                          const isSelected = selectedQuestions.has(q._id);
                          return (
                            <motion.div
                              key={q._id}
                              layout
                              onClick={() => handleSelectQuestion(q)}
                              className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all duration-200",
                                isSelected
                                  ? "bg-accent-500/10 border-accent-500/30"
                                  : "glass-frosted border-transparent hover:border-white/10"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "mt-0.5 w-4 h-4 rounded flex items-center justify-center border flex-shrink-0",
                                  isSelected ? "bg-accent-500 border-accent-500" : "border-dark-500"
                                )}>
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white line-clamp-2">{q.question}</p>
                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-dark-400 font-medium flex-wrap">
                                    <span className={DIFFICULTY_COLORS[q.difficulty]}>{q.difficulty}</span>
                                    <span>{q.chapter}</span>
                                    {q.topic && <span className="text-dark-500">{q.topic}</span>}
                                    <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {q.marks}m</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {q.estimatedTimeSeconds}s</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.04] flex items-center justify-between bg-dark-950/50">
              <div className="text-xs text-dark-400">
                {selectedExamType && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-medium text-dark-200">{selectedExamType}</span>
                    {selectedClasses.length > 0 && <><ChevronRight className="w-3 h-3" /><span>Class {selectedClasses.join(', ')}</span></>}
                    {selectedSubject && <><ChevronRight className="w-3 h-3" /><span className="text-dark-200">{selectedSubject}</span></>}
                    {selectedChapters.length > 0 && <><ChevronRight className="w-3 h-3" /><span>{selectedChapters.length} ch.</span></>}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={loading} icon={Save} disabled={!canShowQuestions}>
                  Save Quiz
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function StepIndicator({ step, label, done, optional }) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
        done
          ? "bg-accent-500 border-accent-500 text-white"
          : "border-dark-500 text-dark-400"
      )}>
        {done ? <Check className="w-3 h-3" /> : step}
      </div>
      <span className={cn("text-xs", done ? "text-white font-medium" : "text-dark-400")}>
        {label}
      </span>
      {optional && !done && <span className="text-[9px] text-dark-500 ml-auto">optional</span>}
    </div>
  );
}

function MiniFilter({ label, value, onChange, options, displayMap }) {
  const getLabel = (opt) => {
    if (displayMap) {
      const key = Object.keys(displayMap).find(k => (QUESTION_TYPES[k] || k) === opt);
      return key ? displayMap[key] : opt;
    }
    return opt;
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg glass-input px-3 py-1 pr-7 text-[11px] text-white focus:outline-none border border-white/[0.04]"
      >
        <option value="">{label}: All</option>
        {options.map((opt) => <option key={opt} value={opt}>{getLabel(opt)}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-dark-500 pointer-events-none" />
    </div>
  );
}
