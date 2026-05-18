import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, X, Plus, Trash2, Clock, Award, BookOpen, Check, Filter, ChevronDown, Wand2, Loader2, Sparkles } from 'lucide-react';
import Button from '../common/Button';
import { quizzesAPI, questionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { DIFFICULTY_COLORS, TYPE_LABELS, QUESTION_TYPES } from '../../utils/constants';
import { cn } from '../../utils/cn';

export default function QuizBuilderModal({ isOpen, onClose, onSuccess, initialQuiz = null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  
  // Filters State
  const [filters, setFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({ subjects: [], chapters: [], topics: [], classes: [] });
  const [showFilters, setShowFilters] = useState(false);

  // Randomizer State
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [targetMarks, setTargetMarks] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationLog, setGenerationLog] = useState('');
  
  // Time Limit Override State
  const [manualTimeLimit, setManualTimeLimit] = useState('');

  // Quiz Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    difficulty: 'Medium',
    tags: '',
    className: '',
    examType: '',
  });

  // Selected Questions Map: id -> question data
  const [selectedQuestions, setSelectedQuestions] = useState(new Map());

  // Load questions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFilterOptions();
      if (initialQuiz) {
        setFormData({
          title: initialQuiz.title || '',
          description: initialQuiz.description || '',
          subject: initialQuiz.subject || '',
          difficulty: initialQuiz.difficulty || 'Medium',
          tags: (initialQuiz.tags || []).join(', '),
          className: initialQuiz.className || '',
          examType: (initialQuiz.examType || []).join(', '),
        });
        const initialSelected = new Map();
        if (initialQuiz.questions && Array.isArray(initialQuiz.questions)) {
           initialQuiz.questions.forEach(q => {
             if (q.questionData) {
               initialSelected.set(q.questionId, { ...q.questionData, _id: q.questionData.id || q.questionId, selectedMarks: q.marks });
             }
           });
        }
        setSelectedQuestions(initialSelected);
      } else {
        setFormData({ title: '', description: '', subject: '', difficulty: 'Medium', tags: '', className: '', examType: '' });
        setSelectedQuestions(new Map());
      }
      setStep(1);
    }
  }, [isOpen, initialQuiz]);

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
    }
  }, [isOpen, filters]);

  const loadFilterOptions = async () => {
    try {
      const res = await questionsAPI.getFilters();
      setFilterOptions(res.data || { subjects: [], chapters: [], topics: [], classes: [] });
    } catch (err) {
      console.error('Failed to load filter options');
    }
  };

  const loadQuestions = async () => {
    try {
      // For simplicity, loading a large batch of published questions
      // In production, implement proper pagination or infinite scroll here
      const res = await questionsAPI.getAll({ limit: 100, status: 'PUBLISHED', ...filters });
      setQuestions(res.data.questions);
    } catch (err) {
      toast.error('Failed to load questions');
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
    selectedQuestions.forEach(q => {
      totalMarks += (q.selectedMarks || q.marks || 1);
      totalSeconds += (q.estimatedTimeSeconds || 60);
    });
    
    // Round to nearest 30 seconds for smart default
    const roundedSeconds = Math.round(totalSeconds / 30) * 30;
    const autoMins = roundedSeconds / 60;
    
    return {
      marks: totalMarks,
      timeLimitMins: manualTimeLimit !== '' ? parseFloat(manualTimeLimit) : (autoMins > 0 ? autoMins : 0)
    };
  }, [selectedQuestions, manualTimeLimit]);

  const handleSave = async () => {
    if (!formData.title || !formData.subject) {
      toast.error('Title and Subject are required');
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
        subject: formData.subject,
        difficulty: formData.difficulty,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        className: formData.className,
        examType: formData.examType.split(',').map(t => t.trim()).filter(Boolean),
        timeLimitMins: calculateTotals.timeLimitMins,
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

  const filteredQuestions = questions.filter(q => 
    (q.question.toLowerCase().includes(search.toLowerCase()) || 
    q.subject.toLowerCase().includes(search.toLowerCase()) ||
    q.chapter.toLowerCase().includes(search.toLowerCase())) &&
    (!filters.tags || (q.tags && q.tags.some(t => t.toLowerCase().includes(filters.tags.toLowerCase()))))
  );

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
            className="relative w-full max-w-5xl h-[85vh] flex flex-col glass-card rounded-2xl overflow-hidden glow-accent inner-shine"
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
              {/* Left Panel: Quiz Details Form */}
              <div className="w-1/3 border-r border-white/[0.04] p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Weekly Physics Mock Test"
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Physics"
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description..."
                    rows={3}
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Difficulty</label>
                  <select
                    value={formData.difficulty}
                    onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full appearance-none rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Class</label>
                  <input
                    type="text"
                    value={formData.className}
                    onChange={e => setFormData({ ...formData, className: e.target.value })}
                    placeholder="e.g. 11, 12"
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Exam Type (comma separated)</label>
                  <input
                    type="text"
                    value={formData.examType}
                    onChange={e => setFormData({ ...formData, examType: e.target.value })}
                    placeholder="e.g. NEET, JEE"
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. mock, weekly, cbse"
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 flex items-center justify-between uppercase">
                    <span>Time Limit (Minutes)</span>
                    {manualTimeLimit !== '' && (
                      <button onClick={() => setManualTimeLimit('')} className="text-[10px] text-accent-500 hover:text-accent-400 normal-case">Reset to Auto</button>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={manualTimeLimit !== '' ? manualTimeLimit : calculateTotals.timeLimitMins}
                    onChange={e => setManualTimeLimit(e.target.value)}
                    placeholder="Auto-calculated"
                    className={cn("w-full rounded-xl glass-input px-4 py-2.5 text-sm focus:outline-none", manualTimeLimit === '' ? "text-dark-300" : "text-white")}
                  />
                  {manualTimeLimit === '' && (
                    <p className="mt-1 text-[10px] text-dark-400">Smart default calculated from selected questions.</p>
                  )}
                </div>
              </div>

              {/* Right Panel: Question Selection */}
              <div className="flex-1 flex flex-col p-5 bg-dark-950/30">
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search questions to add..."
                      className="w-full rounded-xl glass-input pl-10 pr-4 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <Button variant="secondary" onClick={() => { setShowRandomizer(!showRandomizer); setShowFilters(false); }}>
                    <Wand2 className="h-4 w-4" />
                    Auto Generate
                  </Button>
                  <Button variant="secondary" onClick={() => { setShowFilters(!showFilters); setShowRandomizer(false); }}>
                    <Filter className="h-4 w-4" />
                    {Object.keys(filters).length > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent-500"></span>
                    )}
                  </Button>
                </div>

                <AnimatePresence>
                  {showRandomizer && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="glass-card rounded-xl p-5 border border-accent-500/30 bg-accent-500/5 relative overflow-hidden">
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
                          
                          <div className="flex flex-col gap-4">
                             <p className="text-xs text-dark-300">Set your criteria using the filters below, specify the target marks, and we'll automatically assemble the perfect quiz randomly.</p>
                             
                             {!isGenerating ? (
                               <div className="flex items-end gap-3">
                                 <div className="flex-1">
                                   <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Target Max Marks *</label>
                                   <input
                                     type="number"
                                     min="1"
                                     value={targetMarks}
                                     onChange={(e) => setTargetMarks(e.target.value)}
                                     placeholder="e.g. 50"
                                     className="w-full rounded-xl glass-input px-4 py-2 text-sm text-white focus:outline-none"
                                   />
                                 </div>
                                 <Button onClick={handleRandomize} disabled={!targetMarks}>
                                   <Wand2 className="h-4 w-4" />
                                   Generate
                                 </Button>
                               </div>
                             ) : (
                               <div className="space-y-3 py-2">
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="glass-card rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-3">
                          <FilterSelect label="Subject" value={filters.subject || ''} onChange={v => setFilters(f => v ? { ...f, subject: v } : (() => { const n = { ...f }; delete n.subject; return n; })())} options={filterOptions.subjects?.map(s => ({ value: s, label: s })) || []} />
                          <FilterSelect label="Chapter" value={filters.chapter || ''} onChange={v => setFilters(f => v ? { ...f, chapter: v } : (() => { const n = { ...f }; delete n.chapter; return n; })())} options={filterOptions.chapters?.map(c => ({ value: c, label: c })) || []} />
                          <FilterSelect label="Topic" value={filters.topic || ''} onChange={v => setFilters(f => v ? { ...f, topic: v } : (() => { const n = { ...f }; delete n.topic; return n; })())} options={filterOptions.topics?.map(t => ({ value: t, label: t })) || []} />
                          <FilterSelect label="Class" value={filters.class || ''} onChange={v => setFilters(f => v ? { ...f, class: v } : (() => { const n = { ...f }; delete n.class; return n; })())} options={filterOptions.classes?.map(c => ({ value: c, label: c })) || []} />
                          <FilterSelect label="Difficulty" value={filters.difficulty || ''} onChange={v => setFilters(f => v ? { ...f, difficulty: v } : (() => { const n = { ...f }; delete n.difficulty; return n; })())} options={['Easy', 'Medium', 'Hard', 'Expert'].map(d => ({ value: d, label: d }))} />
                          <FilterSelect label="Type" value={filters.type || ''} onChange={v => setFilters(f => v ? { ...f, type: v } : (() => { const n = { ...f }; delete n.type; return n; })())} options={Object.keys(QUESTION_TYPES).map(k => ({ value: QUESTION_TYPES[k], label: TYPE_LABELS[k] }))} />
                        </div>
                        <div className="mt-3 flex items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase tracking-wider">Tags (Local Filter)</label>
                            <input 
                              type="text" 
                              value={filters.tags || ''} 
                              onChange={(e) => setFilters(f => e.target.value ? { ...f, tags: e.target.value } : (() => { const n = { ...f }; delete n.tags; return n; })())} 
                              placeholder="Comma separated tags..." 
                              className="w-full rounded-lg glass-input px-3 py-1.5 text-xs text-white focus:outline-none" 
                            />
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setFilters({})}>Clear Filters</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                  {filteredQuestions.map(q => {
                    const isSelected = selectedQuestions.has(q._id);
                    return (
                      <div 
                        key={q._id}
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
                            "mt-0.5 w-4 h-4 rounded flex items-center justify-center border",
                            isSelected ? "bg-accent-500 border-accent-500" : "border-dark-500"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white line-clamp-2">{q.question}</p>
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-dark-400 font-medium">
                              <span className={DIFFICULTY_COLORS[q.difficulty]}>{q.difficulty}</span>
                              <span>{q.subject} • {q.chapter}</span>
                              <span className="flex items-center gap-1"><Award className="w-3 h-3"/> {q.marks}</span>
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {q.estimatedTimeSeconds}s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredQuestions.length === 0 && (
                    <div className="text-center py-10 text-dark-400 text-sm">
                      No questions found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.04] flex justify-end gap-3 bg-dark-950/50">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={loading} icon={Save}>
                Save Quiz
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-dark-400 mb-1 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg glass-input px-3 py-1.5 pr-8 text-xs text-white focus:outline-none"
        >
          <option value="">All</option>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-dark-500 pointer-events-none" />
      </div>
    </div>
  );
}
