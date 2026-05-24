import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as faceapi from '@vladmandic/face-api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Mic, Maximize, AlertTriangle, Play, ShieldAlert, 
  CheckCircle2, Loader2, StopCircle, Clock, ChevronRight, ChevronLeft,
  XCircle, MonitorSmartphone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../services/api';
import { useTokenWallet } from '../../hooks/useTokenWallet';
import { cn } from '../../utils/cn';

export default function QuizSessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshWallet } = useTokenWallet();

  // Lifecycle Phases: LOADING -> PREFLIGHT -> ACTIVE -> SUMMARY
  const [phase, setPhase] = useState('LOADING');
  
  // Data States
  const [quiz, setQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  
  // Pre-flight States
  const [isDesktop, setIsDesktop] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  
  // Active Quiz States
  const [answers, setAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Refs for State (To avoid stale closures)
  const answersRef = useRef(answers);
  const quizRef = useRef(quiz);
  const attemptIdRef = useRef(attemptId);
  const violationsRef = useRef(violations);
  const isSubmittingRef = useRef(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);

  // General Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const proctoringActiveRef = useRef(false);
  const noFaceFramesRef = useRef(0);
  const multipleFacesFramesRef = useRef(0);

  // 1. Initial Checks & Load Data
  useEffect(() => {
    let mounted = true;

    // Check device type
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    if (mobileRegex.test(navigator.userAgent) || window.innerWidth < 768) {
      setIsDesktop(false);
    }

    // Load Quiz Details
    studentAPI.getQuiz(id)
      .then(res => {
        if (!mounted) return;
        setQuiz(res.data.quiz);
        setPhase('PREFLIGHT');
      })
      .catch(err => {
        if (!mounted) return;
        toast.error('Could not load quiz details');
        navigate('/app/quizzes');
      });

    // Load face-api models
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    ]).then(() => {
      if (mounted) setModelsLoaded(true);
    }).catch(err => {
      console.error('Failed to load models', err);
      toast.error('Failed to load face detection models');
    });

    return () => {
      mounted = false;
      stopMediaTracks();
      clearTimeouts();
    };
  }, [id, navigate]);

  // Cleanup helper
  const clearTimeouts = useCallback(() => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // 2. Pre-flight Handlers
  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamGranted(true);
    } catch (err) {
      console.error(err);
      toast.error('Camera/Microphone access is required.');
    }
  };

  const handleVideoPlay = () => {
    if (!modelsLoaded || detectionIntervalRef.current) return;
    
    // Start face detection loop
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions());
        const isFacePresent = detections.length === 1;
        
        // Update preflight state
        if (phase === 'PREFLIGHT') {
          setFaceDetected(isFacePresent);
        }

        // Active proctoring logic
        if (proctoringActiveRef.current) {
          if (detections.length === 0) {
            noFaceFramesRef.current += 1;
            multipleFacesFramesRef.current = 0;
            if (noFaceFramesRef.current >= 4) {
              triggerViolation('NO_FACE_DETECTED', 'No face was detected in the camera frame for an extended period.');
            } else if (noFaceFramesRef.current === 1) {
              toast('Warning: Please keep your face clearly visible in the camera.', { icon: '⚠️', id: 'face-warning', duration: 4000 });
            }
          } else if (detections.length > 1) {
            multipleFacesFramesRef.current += 1;
            noFaceFramesRef.current = 0;
            if (multipleFacesFramesRef.current >= 3) {
              triggerViolation('MULTIPLE_FACES', 'Multiple faces were detected in the camera frame for an extended period.');
            } else if (multipleFacesFramesRef.current === 1) {
              toast('Warning: Only one person is allowed in the frame.', { icon: '⚠️', id: 'multiple-warning', duration: 4000 });
            }
          } else {
            noFaceFramesRef.current = 0;
            multipleFacesFramesRef.current = 0;
            toast.dismiss('face-warning');
            toast.dismiss('multiple-warning');
          }
        }
      }
    }, 1500);
  };

  // 3. Proctoring Violation & Submission Logic
  const triggerViolation = useCallback(async (type, details) => {
    if (!proctoringActiveRef.current) return;
    proctoringActiveRef.current = false; // Stop further violations immediately
    clearTimeouts();

    const timestamp = new Date().toISOString();
    const violation = { type, details, timestamp };
    setViolations(prev => [...prev, violation]);

    toast.error(`Disqualified: ${details}`, { duration: 5000 });
    
    // Pass the violation to submitAttempt
    await submitAttempt(true, [violation]);
  }, [clearTimeouts]);

  const submitAttempt = useCallback(async (isProctoringFailure = false, currentViolations = []) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    proctoringActiveRef.current = false;
    clearTimeouts();
    stopMediaTracks();

    // Try exiting fullscreen
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      // ignore
    }

    const currentAnswers = answersRef.current;
    const currentQuiz = quizRef.current;
    const currentAttemptId = attemptIdRef.current;

    // Format answers array
    const formattedAnswers = Object.entries(currentAnswers).map(([qId, selected]) => ({
      questionId: qId,
      selectedAnswers: selected
    }));

    try {
      const res = await studentAPI.submitAttempt(currentQuiz.id || currentQuiz.quizId, {
        answers: formattedAnswers,
        isProctoringFailure,
        proctoringViolations: currentViolations,
      });

      setSummaryData(res.data);
      refreshWallet();
      if (currentAttemptId) localStorage.removeItem(`quiz_answers_${currentAttemptId}`);
      setPhase('SUMMARY');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit attempt. ' + (err.message || ''));
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [clearTimeouts, stopMediaTracks, refreshWallet]);

  // 4. Start Quiz
  const startQuiz = async () => {
    if (!camGranted || !faceDetected || !isDesktop) {
      toast.error('Please complete all pre-flight checks.');
      return;
    }

    try {
      // Enter fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      // Start attempt backend
      const res = await studentAPI.startAttempt(quiz.id || quiz.quizId);
      setAttemptId(res.data.attemptId);
      refreshWallet();

      // Setup Timer
      const totalSeconds = (quiz.timeLimitMins || 60) * 60;
      setTimeLeft(totalSeconds);
      
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            submitAttempt(false, violationsRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start Proctoring Listeners
      proctoringActiveRef.current = true;
      setPhase('ACTIVE');
    } catch (err) {
      console.error(err);
      toast.error(err?.message || 'Failed to start quiz');
    }
  };

  // Autosave answers to localStorage
  useEffect(() => {
    if (attemptId) {
      const saved = localStorage.getItem(`quiz_answers_${attemptId}`);
      if (saved) {
        try {
          setAnswers(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [attemptId]);

  useEffect(() => {
    if (attemptId && Object.keys(answers).length > 0) {
      localStorage.setItem(`quiz_answers_${attemptId}`, JSON.stringify(answers));
    }
  }, [answers, attemptId]);

  // Setup Event Listeners for Tab blur & Fullscreen exit
  useEffect(() => {
    if (phase !== 'ACTIVE') return;

    const handleVisibilityChange = () => {
      if (document.hidden && proctoringActiveRef.current) {
        triggerViolation('TAB_SWITCH', 'Switched to a different tab or minimized window.');
      }
    };

    const handleWindowBlur = () => {
      if (proctoringActiveRef.current) {
        triggerViolation('WINDOW_BLUR', 'Clicked outside the quiz window.');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && proctoringActiveRef.current) {
        triggerViolation('FULLSCREEN_EXIT', 'Exited fullscreen mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [phase, triggerViolation]);

  // Auto-redirect on disqualification
  useEffect(() => {
    if (phase === 'SUMMARY' && summaryData?.isProctoringFailure) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/app/activity');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, summaryData, navigate]);

  // --- RENDERING HELPERS ---

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOptionSelect = (qId, optionId, isMultiple) => {
    setAnswers(prev => {
      const current = prev[qId] || [];
      if (isMultiple) {
        if (current.includes(optionId)) return { ...prev, [qId]: current.filter(id => id !== optionId) };
        return { ...prev, [qId]: [...current, optionId] };
      }
      return { ...prev, [qId]: [optionId] };
    });
  };

  if (phase === 'LOADING') {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-accent-500 animate-spin" />
      </div>
    );
  }

  if (phase === 'SUMMARY') {
    const isDisqualified = summaryData.isProctoringFailure;
    return (
      <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl max-w-lg w-full p-8 text-center"
        >
          {isDisqualified ? (
            <div className="h-20 w-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <ShieldAlert className="h-10 w-10 text-rose-500" />
            </div>
          ) : (
            <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
          )}

          <h2 className="text-3xl font-bold text-white mb-2">
            {isDisqualified ? 'Disqualified' : 'Quiz Complete'}
          </h2>
          
          <p className="text-dark-300 mb-8">
            {isDisqualified 
              ? 'Your attempt was terminated due to a proctoring violation.' 
              : `You scored ${summaryData.score} out of ${summaryData.totalMarks} marks.`}
          </p>

          {!isDisqualified && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-sm text-dark-400 mb-1">Accuracy</p>
                <p className="text-xl font-bold text-white">{summaryData.percentage}%</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-sm text-dark-400 mb-1">Correct</p>
                <p className="text-xl font-bold text-emerald-400">{summaryData.correctCount}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-sm text-dark-400 mb-1">Earned</p>
                <p className="text-xl font-bold text-amber-400">+{summaryData.xpEarned} XP</p>
              </div>
            </div>
          )}

          {isDisqualified && summaryData.proctoringViolations?.length > 0 && (
            <div className="bg-rose-500/10 rounded-xl p-4 mb-8 text-left border border-rose-500/20">
              <p className="text-sm font-semibold text-rose-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Violation Record
              </p>
              <ul className="text-xs text-rose-200/80 space-y-2">
                {summaryData.proctoringViolations.map((v, i) => (
                  <li key={i}>• {v.details}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => navigate(isDisqualified ? '/app/activity' : '/app/quizzes')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold transition-all"
          >
            {isDisqualified ? `Go to Activity Dashboard (${countdown}s)` : 'Return to Library'}
          </button>
        </motion.div>
      </div>
    );
  }

  // ACTIVE OR PREFLIGHT
  const isPreflight = phase === 'PREFLIGHT';
  const readyToStart = isDesktop && modelsLoaded && camGranted && faceDetected;

  return (
    <div className="fixed inset-0 z-50 bg-dark-950 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/[0.05] bg-dark-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          {isPreflight && (
            <button onClick={() => navigate('/app/quizzes')} className="p-2 rounded-full hover:bg-white/5 text-dark-400">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-white font-semibold truncate max-w-[200px] md:max-w-md">{quiz?.title}</h1>
            <p className="text-xs text-dark-400">{quiz?.subject} • {quiz?.totalQuestions} Questions</p>
          </div>
        </div>
        
        {!isPreflight && (
          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold tracking-wider",
              timeLeft < 300 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-dark-800 text-white border border-white/10"
            )}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => submitAttempt(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-accent-500 text-white font-semibold text-sm hover:bg-accent-400 transition-colors disabled:opacity-50"
            >
              Submit Quiz
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Main View (Preflight OR Active Quiz) */}
        <div className="flex-1 overflow-y-auto bg-dark-900 p-4 md:p-8">
          {isPreflight ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-dark-950 rounded-2xl p-6 border border-white/[0.05]">
                <h2 className="text-xl font-bold text-white mb-2">Proctoring Pre-flight Checks</h2>
                <p className="text-sm text-dark-300 mb-6">
                  This quiz is strictly proctored. Please ensure you meet all technical requirements before starting.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <MonitorSmartphone className="h-5 w-5 text-dark-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Device Check</p>
                        <p className="text-xs text-dark-400">Desktop browser required</p>
                      </div>
                    </div>
                    {isDesktop ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="h-5 w-5 text-dark-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">AI Proctoring Models</p>
                        <p className="text-xs text-dark-400">Loading face detection engine</p>
                      </div>
                    </div>
                    {modelsLoaded ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Loader2 className="h-5 w-5 text-dark-400 animate-spin" />}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <Camera className="h-5 w-5 text-dark-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Camera & Microphone</p>
                        <p className="text-xs text-dark-400">Required for continuous monitoring</p>
                      </div>
                    </div>
                    {camGranted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <button onClick={requestCamera} className="px-4 py-1.5 rounded-lg bg-accent-500 text-white text-xs font-semibold">
                        Grant Access
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-3">
                      <Maximize className="h-5 w-5 text-dark-400" />
                      <div>
                        <p className="text-sm font-semibold text-white">Fullscreen Enforced</p>
                        <p className="text-xs text-dark-400">Will activate automatically on start</p>
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-dark-500" /> {/* Just informational at this stage */}
                  </div>
                </div>

                {!isDesktop && (
                  <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p>Mobile devices are not supported for proctored quizzes. Please switch to a desktop or laptop browser.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Active Quiz Question View
            <div className="max-w-3xl mx-auto">
              {quiz?.questions[currentQuestionIdx] && (
                <div className="glass-card rounded-3xl p-8 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm font-semibold text-accent-400">Question {currentQuestionIdx + 1} of {quiz.totalQuestions}</span>
                    <span className="text-xs text-dark-400 uppercase tracking-wider">{quiz.questions[currentQuestionIdx].marks} Marks</span>
                  </div>
                  
                  <h3 className="text-xl text-white font-medium mb-8 leading-relaxed">
                    {quiz.questions[currentQuestionIdx].questionData?.question}
                  </h3>

                  <div className="space-y-3">
                    {quiz.questions[currentQuestionIdx].questionData?.options?.map((opt) => {
                      const isMultiple = quiz.questions[currentQuestionIdx].questionData?.questionType === 'MULTI_CORRECT';
                      const qId = quiz.questions[currentQuestionIdx].questionId;
                      const isSelected = (answers[qId] || []).includes(opt.id);

                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleOptionSelect(qId, opt.id, isMultiple)}
                          className={cn(
                            "w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4",
                            isSelected 
                              ? "bg-accent-500/10 border-accent-500 shadow-[0_0_15px_rgba(124,107,245,0.15)]" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                          )}
                        >
                          <div className={cn(
                            "h-5 w-5 rounded flex items-center justify-center border",
                            isMultiple ? "rounded-md" : "rounded-full",
                            isSelected ? "bg-accent-500 border-accent-500 text-white" : "border-dark-500"
                          )}>
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                          <span className={cn("text-base", isSelected ? "text-white" : "text-dark-200")}>
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQuestionIdx(p => Math.max(0, p - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-6 py-3 rounded-xl bg-white/[0.05] text-white font-semibold disabled:opacity-30 flex items-center gap-2"
                >
                  <ChevronLeft className="h-5 w-5" /> Previous
                </button>
                <button
                  onClick={() => setCurrentQuestionIdx(p => Math.min(quiz.totalQuestions - 1, p + 1))}
                  disabled={currentQuestionIdx === quiz.totalQuestions - 1}
                  className="px-6 py-3 rounded-xl bg-white/[0.05] text-white font-semibold disabled:opacity-30 flex items-center gap-2"
                >
                  Next <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Proctoring Feed (Sticky) */}
        <div className="w-80 border-l border-white/[0.05] bg-dark-950 p-6 flex flex-col">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-dark-800 shadow-xl mb-6">
            <video 
              ref={videoRef}
              onPlay={handleVideoPlay}
              muted
              autoPlay
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
            
            {/* Status Overlay */}
            <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
              <div className="flex gap-2">
                <div className={cn("h-2 w-2 rounded-full", camGranted ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
              </div>
              {faceDetected ? (
                 <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-emerald-500/30">
                   FACE ALIGNED
                 </span>
              ) : camGranted ? (
                 <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md border border-rose-500/30">
                   NO FACE DETECTED
                 </span>
              ) : null}
            </div>
          </div>

          {isPreflight && (
            <div className="mt-auto">
              <button
                disabled={!readyToStart}
                onClick={startQuiz}
                className={cn(
                  "w-full py-4 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2",
                  readyToStart 
                    ? "bg-gradient-to-r from-accent-500 to-neon-cyan text-white shadow-[0_0_20px_rgba(124,107,245,0.4)]" 
                    : "bg-dark-800 text-dark-500 cursor-not-allowed"
                )}
              >
                {readyToStart ? <><Play className="h-4 w-4" /> Start & Deduct 1 Token</> : 'Awaiting Checks...'}
              </button>
              <p className="text-center text-[10px] text-dark-500 mt-3 uppercase tracking-wider">
                Requires 1 Token to begin
              </p>
            </div>
          )}

          {!isPreflight && (
            <div className="mt-auto space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs text-dark-400 font-semibold mb-3 uppercase tracking-wider">Proctoring Rules</p>
                <ul className="text-xs text-dark-300 space-y-2">
                  <li className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent-500 mt-1" /> Stay in camera view</li>
                  <li className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent-500 mt-1" /> No additional faces allowed</li>
                  <li className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent-500 mt-1" /> Do not exit fullscreen</li>
                  <li className="flex gap-2"><div className="h-1.5 w-1.5 rounded-full bg-accent-500 mt-1" /> Do not switch tabs</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
