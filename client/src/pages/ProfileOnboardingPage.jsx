import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, User, School, Target, Phone, MapPin, Camera, ArrowRight,
  ArrowLeft, Check, Sparkles, Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const TARGETS = [
  { id: 'Boards', label: 'Boards', emoji: '📚', desc: 'CBSE / State Board Exams' },
  { id: 'NEET', label: 'NEET', emoji: '🩺', desc: 'Medical Entrance' },
  { id: 'JEE', label: 'JEE', emoji: '⚡', desc: 'Engineering Entrance' },
  { id: 'Other', label: 'Other', emoji: '🎯', desc: 'Other Competitive Exams' },
];

const CLASSES = ['6', '7', '8', '9', '10', '11', '12', 'Dropper'];

const STEPS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'academic', label: 'Academics', icon: GraduationCap },
  { id: 'targets', label: 'Targets', icon: Target },
  { id: 'contact', label: 'Contact', icon: Phone },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <motion.div
              animate={{
                scale: isActive ? 1.1 : 1,
                borderColor: isActive
                  ? 'rgba(124,107,245,0.5)'
                  : isDone
                    ? 'rgba(16,185,129,0.4)'
                    : 'rgba(37,45,84,0.5)',
              }}
              className={`
                flex h-9 w-9 items-center justify-center rounded-xl border transition-colors
                ${isActive ? 'bg-accent-500/15 text-accent-300' : isDone ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dark-800/50 text-dark-500'}
              `}
            >
              {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px ${isDone ? 'bg-emerald-500/40' : 'bg-dark-600'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ProfileOnboardingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    class: '',
    school: '',
    target: [],
    contactNumber: '',
    address: '',
  });

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTarget(id) {
    setForm((prev) => ({
      ...prev,
      target: prev.target.includes(id)
        ? prev.target.filter((t) => t !== id)
        : [...prev.target, id],
    }));
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function canNext() {
    if (step === 0) return form.firstName && form.lastName;
    if (step === 1) return form.class && form.school;
    if (step === 2) return form.target.length > 0;
    if (step === 3) return form.contactNumber;
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        await userAPI.uploadProfilePicture(fd);
      }

      const res = await userAPI.completeProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        class: form.class,
        school: form.school,
        target: form.target,
        contactNumber: form.contactNumber,
        address: form.address || undefined,
      });

      updateUser({ ...user, ...res.data.user, isOnboarded: true });
      toast.success("You're all set! Welcome to RankRush.");
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-dark-950 overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full bg-accent-500/[0.06] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -30, 20, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-neon-cyan/[0.05] blur-[100px]"
        />
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
      >
        <div className="glass-card rounded-3xl p-8 glow-accent inner-shine overflow-hidden">
          {/* Top shine */}
          <motion.div
            className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent-400/25 to-transparent"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          {/* Header */}
          <div className="text-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex p-3 rounded-2xl bg-accent-500/15 border border-accent-400/15 mb-3"
            >
              <Sparkles className="h-6 w-6 text-accent-300" />
            </motion.div>
            <h1 className="text-xl font-bold text-white">Complete Your Profile</h1>
            <p className="text-sm text-dark-400 mt-1">Let us know about you so we can personalize your experience</p>
          </div>

          <StepIndicator currentStep={step} />

          {/* Avatar (optional, shown on step 0) */}
          {step === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center mb-5">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="h-20 w-20 rounded-2xl bg-dark-700/50 border border-dark-600 flex items-center justify-center overflow-hidden group-hover:border-accent-400/30 transition-colors">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-dark-500" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500 text-white shadow-lg">
                  <Camera className="h-3.5 w-3.5" />
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </div>
            </motion.div>
          )}

          {/* Step content */}
          <div className="min-h-[200px] relative overflow-hidden">
            <AnimatePresence mode="wait" custom={1}>
              {step === 0 && (
                <motion.div
                  key="step0"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  custom={1}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">First Name</label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={(e) => update('firstName', e.target.value)}
                        className="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">Last Name</label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => update('lastName', e.target.value)}
                        className="w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  custom={1}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-dark-300 mb-2 uppercase tracking-wider">Class</label>
                    <div className="grid grid-cols-4 gap-2">
                      {CLASSES.map((c) => (
                        <motion.button
                          key={c}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => update('class', c)}
                          className={`
                            py-2.5 rounded-xl text-sm font-medium border transition-all
                            ${form.class === c
                              ? 'bg-accent-500/15 border-accent-400/40 text-accent-300 shadow-[0_0_12px_rgba(124,107,245,0.1)]'
                              : 'bg-dark-800/40 border-dark-600/50 text-dark-300 hover:border-dark-500'}
                          `}
                        >
                          {c}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">School / Institute</label>
                    <div className="relative">
                      <School className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                      <input
                        type="text"
                        value={form.school}
                        onChange={(e) => update('school', e.target.value)}
                        className="w-full rounded-xl glass-input pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                        placeholder="Delhi Public School"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  custom={1}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <label className="block text-[11px] font-medium text-dark-300 mb-2 uppercase tracking-wider text-center">
                    What are you preparing for? (select all that apply)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {TARGETS.map((t) => {
                      const selected = form.target.includes(t.id);
                      return (
                        <motion.button
                          key={t.id}
                          type="button"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleTarget(t.id)}
                          className={`
                            relative p-4 rounded-xl border text-left transition-all overflow-hidden
                            ${selected
                              ? 'bg-accent-500/10 border-accent-400/40 shadow-[0_0_20px_rgba(124,107,245,0.08)]'
                              : 'bg-dark-800/30 border-dark-600/50 hover:border-dark-500'}
                          `}
                        >
                          {selected && (
                            <motion.div
                              layoutId="targetCheck"
                              className="absolute top-2 right-2"
                            >
                              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-500 text-white">
                                <Check className="h-3 w-3" />
                              </div>
                            </motion.div>
                          )}
                          <span className="text-xl mb-1 block">{t.emoji}</span>
                          <span className={`text-sm font-semibold block ${selected ? 'text-white' : 'text-dark-200'}`}>
                            {t.label}
                          </span>
                          <span className="text-[11px] text-dark-400 block mt-0.5">{t.desc}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  custom={1}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">Contact Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                      <input
                        type="tel"
                        value={form.contactNumber}
                        onChange={(e) => update('contactNumber', e.target.value.replace(/[^\d+]/g, ''))}
                        className="w-full rounded-xl glass-input pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none"
                        placeholder="+919876543210"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-dark-300 mb-1.5 uppercase tracking-wider">
                      Address <span className="text-dark-500">(optional)</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-dark-500" />
                      <textarea
                        value={form.address}
                        onChange={(e) => update('address', e.target.value)}
                        rows={2}
                        className="w-full rounded-xl glass-input pl-10 pr-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none resize-none"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 gap-3">
            {step > 0 ? (
              <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button icon={ArrowRight} onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                Continue
              </Button>
            ) : (
              <Button icon={Check} onClick={handleSubmit} loading={loading} disabled={!canNext()}>
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
