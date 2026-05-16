import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Trash2, Zap, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Coins, ChevronDown, KeyRound, Check, Loader2 } from 'lucide-react';
import { aiGenerateAPI } from '../../services/api';
import Button from '../common/Button';
import Modal from '../common/Modal';
import toast from 'react-hot-toast';
import { QUESTION_TYPES, TYPE_LABELS } from '../../utils/constants';

const PROVIDERS = [
  { id: 'OPENAI', name: 'OpenAI', defaultModel: 'gpt-4o', color: '#10a37f', icon: '🤖' },
  { id: 'GEMINI', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash', color: '#4285f4', icon: '✨' },
  { id: 'CLAUDE', name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-20250514', color: '#d97706', icon: '🧠' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const EXAM_TYPES = ['NEET', 'CBSE', 'AIIMS', 'JIPMER', 'STATE_PMT', 'OLYMPIAD'];
const SUBJECTS = ['Biology', 'Physics', 'Chemistry', 'Mathematics'];

const INITIAL_FORM = {
  provider: '',
  subject: '',
  topic: '',
  subTopic: '',
  difficulty: '',
  className: '12',
  examType: ['NEET'],
  additionalInstructions: '',
  questionTypes: [{ type: 'MCQ', count: 5 }],
};

export default function AiGenerateModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [envProviders, setEnvProviders] = useState([]);
  const [providerKeys, setProviderKeys] = useState({}); // { providerId: { encrypted: string, models: [], verified: boolean } }
  
  const [keyInputs, setKeyInputs] = useState({});
  const [verifyingKey, setVerifyingKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('config'); // config | generating | results

  useEffect(() => {
    if (isOpen) {
      aiGenerateAPI.getProviders().then(res => {
        setEnvProviders(res.data?.envConfigured || []);
      }).catch(() => {});
      
      const storedKeys = localStorage.getItem('rankrush_ai_keys');
      if (storedKeys) {
        try { setProviderKeys(JSON.parse(storedKeys)); } catch (e) { }
      }
      
      setForm(INITIAL_FORM);
      setResult(null);
      setStep('config');
    }
  }, [isOpen]);

  const saveKeys = (newKeys) => {
    setProviderKeys(newKeys);
    localStorage.setItem('rankrush_ai_keys', JSON.stringify(newKeys));
  };

  const updateForm = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleVerifyKey = async (providerId) => {
    const rawKey = keyInputs[providerId];
    if (!rawKey) return toast.error('Enter an API key first');
    
    setVerifyingKey(providerId);
    try {
      const verifyRes = await aiGenerateAPI.verifyKey(providerId, rawKey);
      if (!verifyRes.data?.valid) throw new Error(verifyRes.data?.error || 'Invalid API key');
      
      const encryptRes = await aiGenerateAPI.encryptKey(rawKey);
      const modelsRes = await aiGenerateAPI.listModels(providerId, rawKey);
      
      const updated = {
        ...providerKeys,
        [providerId]: {
          encrypted: encryptRes.data.encryptedKey,
          verified: true,
          models: modelsRes.data.models || [],
          selectedModel: modelsRes.data.models?.[0]?.id || PROVIDERS.find(p => p.id === providerId).defaultModel
        }
      };
      saveKeys(updated);
      setKeyInputs(prev => ({ ...prev, [providerId]: '' }));
      toast.success(`${providerId} key verified!`);
    } catch (err) {
      toast.error(err.message || 'Key verification failed');
    } finally {
      setVerifyingKey('');
    }
  };

  const removeKey = (providerId) => {
    const updated = { ...providerKeys };
    delete updated[providerId];
    saveKeys(updated);
    if (form.provider === providerId && !envProviders.includes(providerId)) {
      updateForm('provider', '');
    }
  };

  const addQuestionType = () => {
    const used = new Set(form.questionTypes.map(qt => qt.type));
    const available = Object.keys(QUESTION_TYPES).find(t => !used.has(t));
    if (available) updateForm('questionTypes', [...form.questionTypes, { type: available, count: 3 }]);
  };

  const removeQuestionType = (idx) => {
    if (form.questionTypes.length <= 1) return;
    updateForm('questionTypes', form.questionTypes.filter((_, i) => i !== idx));
  };

  const updateQuestionType = (idx, key, value) => {
    const updated = [...form.questionTypes];
    updated[idx] = { ...updated[idx], [key]: value };
    updateForm('questionTypes', updated);
  };

  const toggleExamType = (type) => {
    const current = form.examType;
    updateForm('examType', current.includes(type) ? current.filter(t => t !== type) : [...current, type]);
  };

  const totalQuestions = form.questionTypes.reduce((s, qt) => s + qt.count, 0);

  const handleGenerate = async () => {
    if (!form.provider) return toast.error('Select an AI provider');
    if (!form.subject) return toast.error('Select a subject');
    if (!form.topic.trim()) return toast.error('Enter a topic');
    if (totalQuestions > 50) return toast.error('Max 50 questions per request');

    const providerData = providerKeys[form.provider];
    
    setStep('generating');
    setLoading(true);
    try {
      const payload = { 
        ...form, 
        subTopic: form.subTopic || undefined, 
        difficulty: form.difficulty || undefined, 
        additionalInstructions: form.additionalInstructions || undefined,
        encryptedApiKey: providerData?.encrypted || undefined,
        model: providerData?.selectedModel || undefined
      };
      const res = await aiGenerateAPI.generate(payload);
      setResult(res.data);
      setStep('results');
      toast.success(res.message || 'Generation complete');
    } catch (err) {
      toast.error(err?.message || 'Generation failed');
      setStep('config');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!result?.jobId) return;
    const providerData = providerKeys[result.provider];
    setStep('generating');
    setLoading(true);
    try {
      const res = await aiGenerateAPI.retry(result.jobId, providerData?.encrypted);
      setResult(res.data);
      setStep('results');
      toast.success('Retry complete');
    } catch (err) {
      toast.error(err?.message || 'Retry failed');
      setStep('results');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-4xl">
      <div className="flex items-center gap-3 mb-6 -mt-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-neon-purple flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">AI Question Generator</h2>
          <p className="text-xs text-dark-400">Generate exam-ready questions with AI — saved as drafts for review</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'config' && (
          <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* LEFT COLUMN: PROVIDERS */}
              <div className="col-span-1 space-y-4 border-r border-dark-700/50 pr-4">
                <SectionTitle>Select Provider</SectionTitle>
                {PROVIDERS.map(p => {
                  const hasEnv = envProviders.includes(p.id);
                  const hasLocal = providerKeys[p.id]?.verified;
                  const available = hasEnv || hasLocal;
                  const selected = form.provider === p.id;
                  
                  return (
                    <div key={p.id} className={`rounded-xl border transition-all ${selected ? 'border-accent-500 bg-accent-500/10' : 'border-dark-700/50 bg-dark-800/30'}`}>
                      <button onClick={() => available && updateForm('provider', p.id)} disabled={!available}
                        className={`w-full p-3 text-left flex items-center justify-between ${!available && 'opacity-50 cursor-not-allowed'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
                            <p className="text-[10px] text-dark-400">{hasEnv ? 'Server Configured' : hasLocal ? 'Local Key' : 'No Key'}</p>
                          </div>
                        </div>
                        {selected && <div className="h-2 w-2 rounded-full bg-accent-500 animate-pulse" />}
                      </button>

                      {/* Model Selector if available and selected */}
                      {selected && hasLocal && providerKeys[p.id]?.models?.length > 0 && (
                        <div className="px-3 pb-3 pt-1 border-t border-dark-700/30">
                          <label className="text-[10px] text-dark-400 mb-1 block">Model</label>
                          <select value={providerKeys[p.id].selectedModel} onChange={e => {
                            const up = {...providerKeys};
                            up[p.id].selectedModel = e.target.value;
                            saveKeys(up);
                          }} className="w-full text-xs bg-dark-900 border border-dark-600 rounded p-1 text-white">
                            {providerKeys[p.id].models.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Key Entry UI */}
                      {!hasEnv && !hasLocal && (
                        <div className="px-3 pb-3 pt-1 border-t border-dark-700/30 flex gap-2">
                          <input type="password" placeholder="Enter API Key..." value={keyInputs[p.id] || ''} onChange={e => setKeyInputs(prev => ({...prev, [p.id]: e.target.value}))}
                            className="flex-1 bg-dark-900 border border-dark-600 rounded px-2 py-1.5 text-xs text-white" />
                          <button onClick={() => handleVerifyKey(p.id)} disabled={verifyingKey === p.id} className="bg-accent-500 hover:bg-accent-600 text-white rounded px-2 text-xs flex items-center justify-center min-w-[50px]">
                            {verifyingKey === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                          </button>
                        </div>
                      )}

                      {/* Remove local key */}
                      {!hasEnv && hasLocal && (
                        <div className="px-3 pb-2 pt-1 border-t border-dark-700/30 flex justify-between items-center">
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1"><Check className="h-3 w-3" /> Key Saved</span>
                          <button onClick={() => removeKey(p.id)} className="text-[10px] text-red-400 hover:underline">Remove</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: CONFIG */}
              <div className="col-span-2 space-y-5">
                <SectionTitle>Subject & Topic</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Subject" value={form.subject} onChange={v => updateForm('subject', v)} options={SUBJECTS.map(s => ({ value: s, label: s }))} placeholder="Select subject" />
                  <InputField label="Topic" value={form.topic} onChange={v => updateForm('topic', v)} placeholder="e.g. Cell Division" />
                  <InputField label="Sub-topic (Optional)" value={form.subTopic} onChange={v => updateForm('subTopic', v)} placeholder="e.g. Meiosis" />
                  <SelectField label="Difficulty" value={form.difficulty} onChange={v => updateForm('difficulty', v)} options={DIFFICULTIES.map(d => ({ value: d, label: d }))} placeholder="Any difficulty" />
                </div>

                <SectionTitle>Question Types</SectionTitle>
                <div className="space-y-2">
                  {form.questionTypes.map((qt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select value={qt.type} onChange={e => updateQuestionType(idx, 'type', e.target.value)}
                          className="w-full appearance-none rounded-lg border border-dark-600/50 bg-dark-800/50 px-3 py-2 pr-8 text-xs text-white focus:border-accent-500/50 focus:outline-none">
                          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-500 pointer-events-none" />
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-dark-600/50 bg-dark-800/50 px-1">
                        <button onClick={() => updateQuestionType(idx, 'count', Math.max(1, qt.count - 1))} className="h-7 w-7 flex items-center justify-center text-dark-300 hover:text-white text-sm rounded transition-colors">−</button>
                        <span className="w-8 text-center text-sm font-medium text-white">{qt.count}</span>
                        <button onClick={() => updateQuestionType(idx, 'count', Math.min(20, qt.count + 1))} className="h-7 w-7 flex items-center justify-center text-dark-300 hover:text-white text-sm rounded transition-colors">+</button>
                      </div>
                      <button onClick={() => removeQuestionType(idx)} disabled={form.questionTypes.length <= 1}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {form.questionTypes.length < Object.keys(QUESTION_TYPES).length && (
                  <button onClick={addQuestionType} className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add question type
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Class" value={form.className} onChange={v => updateForm('className', v)} placeholder="e.g. 12" />
                  <div>
                    <label className="block text-[11px] font-medium text-dark-400 mb-1.5 uppercase tracking-wider">Exam Type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAM_TYPES.map(et => (
                        <button key={et} onClick={() => toggleExamType(et)}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${form.examType.includes(et) ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'bg-dark-800/50 text-dark-400 border border-dark-600/30 hover:border-dark-500'}`}>
                          {et}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-dark-400 mb-1.5 uppercase tracking-wider">Additional Instructions (Optional)</label>
                  <textarea value={form.additionalInstructions} onChange={e => updateForm('additionalInstructions', e.target.value)} rows={2} placeholder="e.g. Focus on NCERT-based questions..."
                    className="w-full rounded-lg border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-xs text-white placeholder-dark-500 focus:border-accent-500/50 focus:outline-none resize-none" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 mt-6 border-t border-dark-700/50">
              <div className="text-xs text-dark-400">
                <span className="text-white font-semibold">{totalQuestions}</span> questions will be generated as <span className="text-amber-400">Draft</span>
              </div>
              <Button icon={Zap} onClick={handleGenerate} disabled={!form.provider || !form.subject || !form.topic}>
                Generate Questions
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-accent-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-accent-500 border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-accent-500/20 to-neon-purple/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-accent-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Generating Questions...</h3>
            <p className="text-sm text-dark-400 mb-1">Using <span className="text-accent-400">{PROVIDERS.find(p => p.id === form.provider)?.name}</span></p>
            <p className="text-xs text-dark-500">This may take 15-30 seconds depending on quantity</p>
          </motion.div>
        )}

        {step === 'results' && result && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className={`rounded-xl p-4 mb-5 border ${result.status === 'COMPLETED' ? 'bg-emerald-500/5 border-emerald-500/20' : result.status === 'PARTIAL' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-center gap-3">
                {result.status === 'COMPLETED' ? <CheckCircle2 className="h-6 w-6 text-emerald-400" /> : result.status === 'PARTIAL' ? <AlertTriangle className="h-6 w-6 text-amber-400" /> : <XCircle className="h-6 w-6 text-red-400" />}
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {result.status === 'COMPLETED' ? 'All Questions Generated!' : result.status === 'PARTIAL' ? 'Partial Success' : 'Generation Failed'}
                  </h3>
                  <p className="text-xs text-dark-400 mt-0.5">
                    {result.totalGenerated}/{result.totalRequested} questions created as drafts
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-5">
              <MiniStat icon={Sparkles} label="Generated" value={result.totalGenerated} color="text-emerald-400" />
              <MiniStat icon={XCircle} label="Failed" value={result.totalFailed} color="text-red-400" />
              <MiniStat icon={Clock} label="Latency" value={`${(result.latencyMs / 1000).toFixed(1)}s`} color="text-cyan-400" />
              <MiniStat icon={Coins} label="Est. Cost" value={`$${result.estimatedCost}`} color="text-amber-400" />
            </div>

            <div className="glass-card rounded-xl p-3 mb-5">
              <p className="text-[10px] text-dark-400 uppercase tracking-wider mb-2">Token Usage — {result.model}</p>
              <div className="flex gap-6 text-xs">
                <span className="text-dark-300">Prompt: <span className="text-white font-medium">{result.usage?.promptTokens?.toLocaleString()}</span></span>
                <span className="text-dark-300">Completion: <span className="text-white font-medium">{result.usage?.completionTokens?.toLocaleString()}</span></span>
                <span className="text-dark-300">Total: <span className="text-accent-400 font-medium">{result.usage?.totalTokens?.toLocaleString()}</span></span>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] text-dark-400 uppercase tracking-wider mb-2">Errors ({result.errors.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-400/80 bg-red-500/5 rounded-lg px-3 py-1.5 border border-red-500/10">
                      <span className="text-red-400 font-medium">{err.questionId || `#${err.index}`}:</span>{' '}
                      {(err.errors || []).join('; ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-dark-700/50">
              {(result.status === 'FAILED' || result.status === 'PARTIAL') && (
                <Button variant="secondary" icon={RefreshCw} onClick={handleRetry} loading={loading}>Retry Generation</Button>
              )}
              <div className="ml-auto">
                <Button icon={CheckCircle2} onClick={() => { onSuccess?.(); onClose(); }}>Done — View Drafts</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

function SectionTitle({ children }) {
  return <p className="text-[11px] font-semibold text-dark-300 uppercase tracking-wider mb-2">{children}</p>;
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-dark-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-xs text-white placeholder-dark-500 focus:border-accent-500/50 focus:outline-none transition-all" />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-dark-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-dark-600/50 bg-dark-800/50 px-3 py-2 pr-8 text-xs text-white focus:border-accent-500/50 focus:outline-none">
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-dark-500 pointer-events-none" />
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-dark-400">{label}</p>
    </div>
  );
}
