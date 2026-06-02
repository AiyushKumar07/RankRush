import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Trash2, Zap, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Coins, ChevronDown, Check, Loader2 } from 'lucide-react';
import { aiGenerateAPI, questionsAPI } from '../../services/api';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Combobox from '../ui/Combobox';
import toast from 'react-hot-toast';

const PROVIDERS = [
  { id: 'OPENAI', name: 'OpenAI', defaultModel: 'gpt-4o', color: '#10a37f', icon: '🤖' },
  { id: 'GEMINI', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash', color: '#4285f4', icon: '✨' },
  { id: 'CLAUDE', name: 'Anthropic Claude', defaultModel: 'claude-sonnet-4-20250514', color: '#d97706', icon: '🧠' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert'];
const EXAM_TYPES = ['NEET', 'CBSE', 'AIIMS', 'JIPMER', 'STATE_PMT', 'OLYMPIAD'];
const SUBJECTS = ['Biology', 'Physics', 'Chemistry', 'Mathematics'];

const TYPE_LABELS = {
  MCQ: "MCQ",
  MULTI_CORRECT: "Multi-correct",
  ASSERTION_REASON: "Assertion-reason",
  CASE_BASED: "Case-based",
  MATCH_THE_FOLLOWING: "Match",
  TRUE_FALSE: "True / false",
  DIAGRAM_BASED: "Diagram-based"
};

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
  const [providerKeys, setProviderKeys] = useState({});
  const [keyInputs, setKeyInputs] = useState({});
  const [verifyingKey, setVerifyingKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('config');
  const [topicOptions, setTopicOptions] = useState([]);

  useEffect(() => {
    questionsAPI.getFilters().then(res => {
      const payload = res?.data ?? res ?? {};
      const topics = payload.topics || [];
      setTopicOptions(topics.filter(Boolean).map(t => ({ value: t, label: t })));
    }).catch(() => setTopicOptions([]));
  }, []);

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
    const available = Object.keys(TYPE_LABELS).find(t => !used.has(t));
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
    <Modal open={isOpen} onClose={onClose} title="AI Question Generator" size="xl">
      <p style={{ margin: '-12px 0 24px', fontSize: '13px', color: 'var(--rr-fg-muted)' }}>Generate exam-ready questions with AI — saved as drafts for review</p>
      <div style={{ minHeight: '400px' }}>
        <AnimatePresence mode="wait">
          {step === 'config' && (
            <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
                {/* PROVIDERS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderRight: '1px solid var(--rr-border)', paddingRight: '20px' }}>
                  <SectionTitle>Select Provider</SectionTitle>
                  {PROVIDERS.map(p => {
                    const hasEnv = envProviders.includes(p.id);
                    const hasLocal = providerKeys[p.id]?.verified;
                    const available = hasEnv || hasLocal;
                    const selected = form.provider === p.id;
                    return (
                      <div key={p.id} style={{
                        border: `1px solid ${selected ? 'var(--rr-violet-500)' : 'var(--rr-border)'}`,
                        background: selected ? 'color-mix(in oklab, var(--rr-violet-500) 12%, transparent)' : 'var(--rr-bg)',
                        borderRadius: 'var(--rr-r-md)',
                        overflow: 'hidden',
                        transition: 'all var(--rr-dur-base)'
                      }}>
                        <button onClick={() => available && updateForm('provider', p.id)} disabled={!available}
                          style={{
                            width: '100%', padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            opacity: !available ? 0.5 : 1, cursor: !available ? 'not-allowed' : 'pointer', background: 'transparent', border: 'none'
                          }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{p.icon}</span>
                            <div>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--rr-fg)' }}>{p.name}</p>
                              <p style={{ margin: 0, fontSize: '10px', color: 'var(--rr-fg-muted)' }}>{hasEnv ? 'Server Configured' : hasLocal ? 'Local Key' : 'No Key'}</p>
                            </div>
                          </div>
                          {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rr-violet-500)' }} />}
                        </button>
                        {selected && hasLocal && providerKeys[p.id]?.models?.length > 0 && (
                          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--rr-border)' }}>
                            <label style={{ fontSize: '10px', color: 'var(--rr-fg-muted)', display: 'block', marginBottom: '4px' }}>Model</label>
                            <Select value={providerKeys[p.id].selectedModel} onChange={v => {
                              const up = {...providerKeys};
                              up[p.id].selectedModel = v;
                              saveKeys(up);
                            }} options={providerKeys[p.id].models.map(m => ({ value: m.id, label: m.name }))} />
                          </div>
                        )}
                        {!hasEnv && !hasLocal && (
                          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--rr-border)', display: 'flex', gap: '8px' }}>
                            <input type="password" placeholder="Enter API Key..." value={keyInputs[p.id] || ''} onChange={e => setKeyInputs(prev => ({...prev, [p.id]: e.target.value}))}
                              style={{ flex: 1, padding: '6px 8px', fontSize: '12px', borderRadius: 'var(--rr-r-sm)', border: '1px solid var(--rr-border)', background: 'var(--rr-bg)' }} />
                            <button onClick={() => handleVerifyKey(p.id)} disabled={verifyingKey === p.id} className="btn btn-primary btn-sm">
                              {verifyingKey === p.id ? <Loader2 size={12} className="aq-spin" /> : 'Save'}
                            </button>
                          </div>
                        )}
                        {!hasEnv && hasLocal && (
                          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--rr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', color: 'var(--rr-emerald-500)', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Key Saved</span>
                            <button onClick={() => removeKey(p.id)} style={{ fontSize: '10px', color: 'var(--rr-coral-500)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* CONFIG */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <SectionTitle>Subject & Topic</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <SelectField label="Subject" value={form.subject} onChange={v => updateForm('subject', v)} options={SUBJECTS.map(s => ({ value: s, label: s }))} placeholder="Select subject" />
                    <ComboboxField label="Topic" value={form.topic} onChange={v => updateForm('topic', v)} options={topicOptions} placeholder="e.g. Cell Division" />
                    <ComboboxField label="Sub-topic (Optional)" value={form.subTopic} onChange={v => updateForm('subTopic', v)} options={[]} placeholder="e.g. Meiosis" />
                    <SelectField label="Difficulty" value={form.difficulty} onChange={v => updateForm('difficulty', v)} options={DIFFICULTIES.map(d => ({ value: d, label: d }))} placeholder="Any difficulty" />
                  </div>

                  <SectionTitle>Question Types</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {form.questionTypes.map((qt, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <Select
                            value={qt.type}
                            onChange={v => updateQuestionType(idx, 'type', v)}
                            options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--rr-surface)', border: '1px solid var(--rr-border)', padding: '2px', borderRadius: 'var(--rr-r-md)' }}>
                          <button onClick={() => updateQuestionType(idx, 'count', Math.max(1, qt.count - 1))} style={{ width: '28px', height: '28px', borderRadius: 'var(--rr-r-sm)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
                          <span style={{ width: '24px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>{qt.count}</span>
                          <button onClick={() => updateQuestionType(idx, 'count', Math.min(20, qt.count + 1))} style={{ width: '28px', height: '28px', borderRadius: 'var(--rr-r-sm)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
                        </div>
                        <button onClick={() => removeQuestionType(idx)} disabled={form.questionTypes.length <= 1}
                          style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: form.questionTypes.length <= 1 ? 'var(--rr-border-strong)' : 'var(--rr-coral-500)', cursor: form.questionTypes.length <= 1 ? 'not-allowed' : 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {form.questionTypes.length < Object.keys(TYPE_LABELS).length && (
                    <button onClick={addQuestionType} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--rr-violet-500)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>
                      <Plus size={14} /> Add question type
                    </button>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <InputField label="Class" value={form.className} onChange={v => updateForm('className', v)} placeholder="e.g. 12" />
                    <div>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Exam Type</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {EXAM_TYPES.map(et => (
                          <button key={et} onClick={() => toggleExamType(et)}
                            style={{
                              padding: '4px 10px', fontSize: '11px', fontWeight: 600, borderRadius: 'var(--rr-r-sm)', cursor: 'pointer',
                              border: `1px solid ${form.examType.includes(et) ? 'var(--rr-violet-500)' : 'var(--rr-border)'}`,
                              background: form.examType.includes(et) ? 'color-mix(in oklab, var(--rr-violet-500) 12%, transparent)' : 'var(--rr-surface)',
                              color: form.examType.includes(et) ? 'var(--rr-violet-400)' : 'var(--rr-fg-muted)',
                            }}>
                            {et}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>Additional Instructions (Optional)</label>
                    <textarea value={form.additionalInstructions} onChange={e => updateForm('additionalInstructions', e.target.value)} rows={2} placeholder="e.g. Focus on NCERT-based questions..."
                      style={{ width: '100%', borderRadius: 'var(--rr-r-md)', padding: '10px 12px', fontSize: '13px', background: 'var(--rr-bg)', border: '1px solid var(--rr-border)', color: 'var(--rr-fg)', resize: 'none', outline: 'none' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--rr-border)' }}>
                <div style={{ fontSize: '13px', color: 'var(--rr-fg-muted)' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--rr-fg)' }}>{totalQuestions}</span> questions will be generated as <span style={{ fontWeight: 'bold', color: 'var(--rr-amber-500)' }}>Draft</span>
                </div>
                <button className="btn btn-accent" onClick={handleGenerate} disabled={!form.provider || !form.subject || !form.topic}>
                  <Zap size={14} /> Generate Questions
                </button>
              </div>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '60px 0', textAlign: 'center' }}>
              <Loader2 size={48} className="aq-spin" style={{ color: 'var(--rr-violet-500)', margin: '0 auto 24px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>Generating Questions...</h3>
              <p style={{ fontSize: '14px', color: 'var(--rr-fg-muted)', marginBottom: '4px' }}>Using <span style={{ color: 'var(--rr-violet-500)', fontWeight: 600 }}>{PROVIDERS.find(p => p.id === form.provider)?.name}</span></p>
              <p style={{ fontSize: '12px', color: 'var(--rr-fg-dim)' }}>This may take 15-30 seconds depending on quantity</p>
            </motion.div>
          )}

          {step === 'results' && result && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{
                borderRadius: 'var(--rr-r-lg)', padding: '20px', marginBottom: '24px',
                background: result.status === 'COMPLETED' ? 'rgba(34,197,94,0.08)' : result.status === 'PARTIAL' ? 'rgba(245,166,35,0.08)' : 'rgba(242,90,56,0.08)',
                border: `1px solid ${result.status === 'COMPLETED' ? 'var(--rr-emerald-500)' : result.status === 'PARTIAL' ? 'var(--rr-amber-500)' : 'var(--rr-coral-500)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {result.status === 'COMPLETED' ? <CheckCircle2 size={24} color="var(--rr-emerald-500)" /> : result.status === 'PARTIAL' ? <AlertTriangle size={24} color="var(--rr-amber-500)" /> : <XCircle size={24} color="var(--rr-coral-500)" />}
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 4px' }}>
                      {result.status === 'COMPLETED' ? 'All Questions Generated!' : result.status === 'PARTIAL' ? 'Partial Success' : 'Generation Failed'}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--rr-fg-muted)', margin: 0 }}>
                      {result.totalGenerated}/{result.totalRequested} questions created as drafts
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <MiniStat icon={Sparkles} label="Generated" value={result.totalGenerated} color="var(--rr-emerald-500)" />
                <MiniStat icon={XCircle} label="Failed" value={result.totalFailed} color="var(--rr-coral-500)" />
                <MiniStat icon={Clock} label="Latency" value={`${(result.latencyMs / 1000).toFixed(1)}s`} color="var(--rr-cyan-500)" />
                <MiniStat icon={Coins} label="Est. Cost" value={`$${result.estimatedCost}`} color="var(--rr-amber-500)" />
              </div>

              <div style={{ background: 'var(--rr-surface)', borderRadius: 'var(--rr-r-md)', padding: '16px', border: '1px solid var(--rr-border)', marginBottom: '24px' }}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Token Usage — {result.model}</p>
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--rr-fg-dim)' }}>Prompt: <span style={{ color: 'var(--rr-fg)', fontWeight: 600 }}>{result.usage?.promptTokens?.toLocaleString()}</span></span>
                  <span style={{ color: 'var(--rr-fg-dim)' }}>Completion: <span style={{ color: 'var(--rr-fg)', fontWeight: 600 }}>{result.usage?.completionTokens?.toLocaleString()}</span></span>
                  <span style={{ color: 'var(--rr-fg-dim)' }}>Total: <span style={{ color: 'var(--rr-violet-500)', fontWeight: 600 }}>{result.usage?.totalTokens?.toLocaleString()}</span></span>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Errors ({result.errors.length})</p>
                  <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {result.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: '12px', background: 'rgba(242,90,56,0.06)', borderRadius: 'var(--rr-r-sm)', padding: '8px 12px', color: 'var(--rr-coral-500)', border: '1px solid rgba(242,90,56,0.1)' }}>
                        <strong>{err.questionId || `#${err.index}`}:</strong> {(err.errors || []).join('; ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--rr-border)' }}>
                {(result.status === 'FAILED' || result.status === 'PARTIAL') ? (
                  <button className="btn btn-secondary" onClick={handleRetry} disabled={loading}><RefreshCw size={14} /> Retry Generation</button>
                ) : <div />}
                <button className="btn btn-primary" onClick={() => { onSuccess?.(); onClose(); }}><CheckCircle2 size={14} /> Done</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

function SectionTitle({ children }) {
  return <p style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>{children}</p>;
}

function InputField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', borderRadius: 'var(--rr-r-md)', padding: '10px 12px', fontSize: '13px', background: 'var(--rr-bg)', border: '1px solid var(--rr-border)', color: 'var(--rr-fg)', outline: 'none' }} />
    </div>
  );
}

function ComboboxField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>{label}</label>
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>{label}</label>
      <Select
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: 'var(--rr-surface)', borderRadius: 'var(--rr-r-md)', padding: '16px', textAlign: 'center', border: '1px solid var(--rr-border)' }}>
      <Icon size={18} style={{ color, margin: '0 auto 8px' }} />
      <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px', color: 'var(--rr-fg)' }}>{value}</p>
      <p style={{ fontSize: '10px', color: 'var(--rr-fg-muted)', fontWeight: 500, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  );
}
