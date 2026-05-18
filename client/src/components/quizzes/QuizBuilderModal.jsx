import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Save, X, Plus, Trash2, Clock, Award, BookOpen, Check } from 'lucide-react';
import Button from '../common/Button';
import { quizzesAPI, questionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { DIFFICULTY_COLORS, TYPE_LABELS } from '../../utils/constants';
import { cn } from '../../utils/cn';

export default function QuizBuilderModal({ isOpen, onClose, onSuccess, initialQuiz = null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState('');
  
  // Quiz Form Data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    difficulty: 'Medium',
    tags: '',
  });

  // Selected Questions Map: id -> question data
  const [selectedQuestions, setSelectedQuestions] = useState(new Map());

  // Load questions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadQuestions();
      if (initialQuiz) {
        setFormData({
          title: initialQuiz.title || '',
          description: initialQuiz.description || '',
          subject: initialQuiz.subject || '',
          difficulty: initialQuiz.difficulty || 'Medium',
          tags: (initialQuiz.tags || []).join(', '),
        });
        const initialSelected = new Map();
        if (initialQuiz.questions && Array.isArray(initialQuiz.questions)) {
           initialQuiz.questions.forEach(q => {
             if (q.questionData) {
               initialSelected.set(q.questionId, { ...q.questionData, selectedMarks: q.marks });
             }
           });
        }
        setSelectedQuestions(initialSelected);
      } else {
        setFormData({ title: '', description: '', subject: '', difficulty: 'Medium', tags: '' });
        setSelectedQuestions(new Map());
      }
      setStep(1);
    }
  }, [isOpen, initialQuiz]);

  const loadQuestions = async () => {
    try {
      // For simplicity, loading a large batch of published questions
      // In production, implement proper pagination or infinite scroll here
      const res = await questionsAPI.getAll({ limit: 100, status: 'PUBLISHED' });
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
    return {
      marks: totalMarks,
      timeLimitMins: Math.ceil(totalSeconds / 60)
    };
  }, [selectedQuestions]);

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
        timeLimitMins: calculateTotals.timeLimitMins,
        questions: Array.from(selectedQuestions.values()).map((q, i) => ({
          questionId: q._id,
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

  const filteredQuestions = questions.filter(q => 
    q.question.toLowerCase().includes(search.toLowerCase()) || 
    q.subject.toLowerCase().includes(search.toLowerCase()) ||
    q.chapter.toLowerCase().includes(search.toLowerCase())
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
                  <label className="block text-xs font-semibold text-dark-400 mb-1.5 uppercase">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="e.g. mock, weekly, cbse"
                    className="w-full rounded-xl glass-input px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Right Panel: Question Selection */}
              <div className="flex-1 flex flex-col p-5 bg-dark-950/30">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search questions to add..."
                    className="w-full rounded-xl glass-input pl-10 pr-4 py-2 text-sm text-white focus:outline-none"
                  />
                </div>

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
