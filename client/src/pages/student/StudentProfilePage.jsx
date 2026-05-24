import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Mail, Phone, GraduationCap, School, MapPin, Save, Loader2, Target as TargetIcon,
  Check, ShieldCheck, Crown, Flame, Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { userAPI } from '../../services/api';
import { useStudentStats } from '../../context/StudentStatsContext';
import { cn } from '../../utils/cn';

const TARGETS = [
  { id: 'Boards', label: 'Boards', emoji: '📚' },
  { id: 'NEET', label: 'NEET', emoji: '🩺' },
  { id: 'JEE', label: 'JEE', emoji: '⚡' },
  { id: 'Other', label: 'Other', emoji: '🎯' },
];

const CLASSES = ['6', '7', '8', '9', '10', '11', '12', 'Dropper'];

function Field({ label, icon: Icon, children, hint }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-dark-400 font-medium flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-dark-500 mt-1 block">{hint}</span>}
    </label>
  );
}

export default function StudentProfilePage() {
  const { user, updateUser } = useAuth();
  const { stats } = useStudentStats();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    class: user?.class || '',
    school: user?.school || '',
    target: user?.target || [],
    contactNumber: user?.contactNumber || '',
    address: user?.address || '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Track if form has changed from user data
  const hasChanges = 
    form.firstName !== (user?.firstName || '') ||
    form.lastName !== (user?.lastName || '') ||
    form.class !== (user?.class || '') ||
    form.school !== (user?.school || '') ||
    JSON.stringify(form.target) !== JSON.stringify(user?.target || []) ||
    form.contactNumber !== (user?.contactNumber || '') ||
    form.address !== (user?.address || '');

  const fullName =
    [form.firstName, form.lastName].filter(Boolean).join(' ') || user?.name || 'Student';
  const initial = (form.firstName || user?.name || 'S').charAt(0).toUpperCase();

  async function saveAll() {
    setIsSaving(true);
    try {
      const res = await userAPI.updateProfile(form);
      const updated = res?.data?.user || res?.user;
      if (updated) updateUser(updated);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  }

  function toggleTarget(id) {
    const next = form.target.includes(id)
      ? form.target.filter((t) => t !== id)
      : [...form.target, id];
    setForm((f) => ({ ...f, target: next }));
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const res = await userAPI.uploadProfilePicture(fd);
      const newPicUrl = res?.data?.profilePicture || res?.profilePicture;
      if (newPicUrl) {
        updateUser({
          ...user,
          profilePicture: newPicUrl,
          avatar: newPicUrl,
        });
        toast.success('Profile picture updated');
      } else {
        throw new Error('Invalid server response');
      }
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-dark-400 mb-1">Profile</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Your <span className="gradient-text">student profile</span>
          </h1>
          <p className="text-dark-300 mt-2 max-w-xl">
            Update your details. Email is locked for security.
          </p>
        </div>
        {hasChanges && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <button
              onClick={saveAll}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-white shadow-lg shadow-accent-500/20 font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </motion.div>
        )}
      </div>

      {/* Identity header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/15 via-transparent to-neon-cyan/[0.08] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl overflow-hidden relative border border-accent-400/20 shadow-xl shadow-accent-500/10">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-accent-500/30 to-neon-cyan/15 flex items-center justify-center text-3xl font-extrabold gradient-text">
                  {initial}
                </div>
              )}

              {/* Premium Glassmorphic Loader Overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm flex items-center justify-center border border-accent-500/30 animate-pulse">
                  <Loader2 className="h-6 w-6 text-accent-400 animate-spin" />
                </div>
              )}
            </div>

            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-accent-500 hover:bg-accent-400 text-white shadow-lg shadow-accent-500/40 transition-colors disabled:opacity-50"
              title="Change photo"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} hidden />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{fullName}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-dark-300">
              <Mail className="h-4 w-4" />
              {user?.email}
              <span className="inline-flex items-center gap-1 ml-2 text-[10px] uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                <ShieldCheck className="h-3 w-3" />
                Verified
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                Lvl {stats?.level ?? 1} · {stats?.rankTitle ?? 'Rookie Learner'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-500/10 text-orange-300 border border-orange-500/20 text-xs font-semibold">
                <Flame className="h-3.5 w-3.5" />
                {stats?.streak ?? 0}-day streak
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold">
                <Crown className="h-3.5 w-3.5" />
                Free Plan
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Editable fields */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Personal */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Personal info</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 outline-none"
                />
              </Field>
              <Field label="Last name">
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 outline-none"
                />
              </Field>
            </div>

            <Field label="Email" icon={Mail} hint="Email is locked — contact support to change.">
              <input
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-sm text-dark-300 cursor-not-allowed"
              />
            </Field>

            <Field label="Phone" icon={Phone}>
              <input
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 outline-none"
              />
            </Field>

            <Field label="Address" icon={MapPin}>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="City, State"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 outline-none"
              />
            </Field>
          </div>
        </div>

        {/* Academics */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Academics</h3>
          <div className="space-y-4">
            <Field label="Class" icon={GraduationCap}>
              <div className="grid grid-cols-4 gap-2">
                {CLASSES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, class: c }))}
                    className={cn(
                      'py-2 rounded-lg text-sm font-medium border transition-all',
                      form.class === c
                        ? 'bg-accent-500/15 text-accent-200 border-accent-500/30'
                        : 'bg-white/[0.02] text-dark-300 border-white/[0.05] hover:text-dark-100 hover:border-white/[0.1]',
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="School / Institute" icon={School}>
              <input
                value={form.school}
                onChange={(e) => setForm({ ...form, school: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-sm text-dark-100 outline-none"
              />
            </Field>

            <Field label="Targets" icon={TargetIcon} hint="Pick all that apply — we'll personalize your feed.">
              <div className="flex flex-wrap gap-2">
                {TARGETS.map((t) => {
                  const active = form.target.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTarget(t.id)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2',
                        active
                          ? 'bg-accent-500/15 text-accent-200 border-accent-500/30'
                          : 'bg-white/[0.02] text-dark-300 border-white/[0.05] hover:border-white/[0.1] hover:text-dark-100',
                      )}
                    >
                      <span>{t.emoji}</span>
                      {t.label}
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>
      </div>

    </div>
  );
}
