import { useState, useRef, useEffect } from 'react';
import { X, Plus, Image as ImageIcon, Trash2 } from 'lucide-react';
import Select from '../ui/Select';
import Combobox from '../ui/Combobox';
import { questionsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  MCQ: "MCQ",
  MULTI_CORRECT: "Multi-correct",
  ASSERTION_REASON: "Assertion-reason",
  CASE_BASED: "Case-based",
  MATCH_THE_FOLLOWING: "Match",
  TRUE_FALSE: "True / false",
  DIAGRAM_BASED: "Diagram-based"
};

const labelCls = 'block text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wider';

function TagInput({ label, value = [], onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
  };
  return (
    <div>
      <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {value.map((t, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: 'var(--rr-r-sm)', background: 'var(--rr-bg-alt)', padding: '4px 8px', fontSize: '12px', color: 'var(--rr-fg)' }}>
            {t}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--rr-fg-muted)', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder || 'Type and press Enter'} 
          style={{ flex: 1, borderRadius: 'var(--rr-r-sm)', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--rr-border)', background: 'var(--rr-bg)', color: 'var(--rr-fg)', outline: 'none' }} />
        <button className="btn btn-secondary btn-sm" onClick={add} type="button">Add</button>
      </div>
    </div>
  );
}

export default function QuestionEditor({ question, onSave, onCancel }) {
  const [data, setData] = useState({ ...question });
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    questionsAPI.getFilters().then(res => {
      const payload = res?.data ?? res ?? {};
      setFilters(payload);
    }).catch(() => {});
  }, []);

  const toOptions = (arr = []) => arr.filter(Boolean).map(x => ({ label: x, value: x }));

  const set = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  const inputStyle = { width: '100%', borderRadius: 'var(--rr-r-sm)', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--rr-border)', background: 'var(--rr-bg)', color: 'var(--rr-fg)', outline: 'none' };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await questionsAPI.uploadImage(formData);
      set('questionImageUrl', res.data?.url || res.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const renderOptions = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Options</label>
      {(data.options || []).map((opt, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={opt.id} onChange={(e) => { const o = [...data.options]; o[idx] = { ...o[idx], id: e.target.value }; set('options', o); }} 
            style={{ width: '48px', borderRadius: 'var(--rr-r-sm)', padding: '8px', fontSize: '12px', border: '1px solid var(--rr-border)', background: 'var(--rr-bg)', color: 'var(--rr-fg)', textAlign: 'center', outline: 'none' }} placeholder="ID" />
          <input type="text" value={opt.text || ''} onChange={(e) => { const o = [...data.options]; o[idx] = { ...o[idx], text: e.target.value }; set('options', o); }} 
            style={{ flex: 1, borderRadius: 'var(--rr-r-sm)', padding: '8px 12px', fontSize: '13px', border: '1px solid var(--rr-border)', background: 'var(--rr-bg)', color: 'var(--rr-fg)', outline: 'none' }} placeholder="Option text" />
          <button onClick={() => set('options', data.options.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--rr-fg-muted)', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => set('options', [...(data.options || []), { id: String.fromCharCode(65 + (data.options?.length || 0)), text: '' }])} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Add Option</button>
    </div>
  );

  const renderCorrectAnswer = (multi) => (
    <div>
      <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>{multi ? 'Correct Answers (comma separated IDs)' : 'Correct Answer'}</label>
      <input type="text" value={data.correctAnswer?.join(', ') || ''} onChange={(e) => set('correctAnswer', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} style={inputStyle} placeholder={multi ? 'e.g. A, C' : 'e.g. A'} />
    </div>
  );

  const renderMatchPairs = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Match Pairs</label>
      {(data.matchPairs || []).map((pair, idx) => (
        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={pair.left || ''} onChange={(e) => { const p = [...data.matchPairs]; p[idx] = { ...p[idx], left: e.target.value }; set('matchPairs', p); }} style={inputStyle} placeholder="Left" />
          <span style={{ color: 'var(--rr-fg-muted)' }}>↔</span>
          <input type="text" value={pair.right || ''} onChange={(e) => { const p = [...data.matchPairs]; p[idx] = { ...p[idx], right: e.target.value }; set('matchPairs', p); }} style={inputStyle} placeholder="Right" />
          <button onClick={() => set('matchPairs', data.matchPairs.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', color: 'var(--rr-fg-muted)', cursor: 'pointer', padding: '4px' }}><Trash2 size={16} /></button>
        </div>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => set('matchPairs', [...(data.matchPairs || []), { left: '', right: '' }])} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Add Pair</button>
    </div>
  );

  const renderCaseStudy = () => {
    const cs = data.caseStudy || { passage: '', subQuestions: [] };
    const setCS = (updates) => set('caseStudy', { ...cs, ...updates });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid var(--rr-border)', borderRadius: 'var(--rr-r-md)', padding: '16px', background: 'var(--rr-surface)' }}>
        <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Case Study Passage</label>
        <textarea value={cs.passage || ''} onChange={(e) => setCS({ passage: e.target.value })} rows={3} style={inputStyle} />
        <label className={labelCls} style={{ color: 'var(--rr-fg-muted)', marginTop: '8px' }}>Sub-Questions</label>
        {(cs.subQuestions || []).map((sq, si) => (
          <div key={si} style={{ background: 'var(--rr-bg-alt)', borderRadius: 'var(--rr-r-md)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--rr-fg)' }}>Sub-Q {si + 1}</span>
              <button onClick={() => setCS({ subQuestions: cs.subQuestions.filter((_, i) => i !== si) })} style={{ background: 'none', border: 'none', color: 'var(--rr-fg-muted)', cursor: 'pointer' }}><Trash2 size={14} /></button>
            </div>
            <input type="text" value={sq.question || ''} onChange={(e) => { const sqs = [...cs.subQuestions]; sqs[si] = { ...sqs[si], question: e.target.value }; setCS({ subQuestions: sqs }); }} style={inputStyle} placeholder="Sub-question text" />
            {(sq.options || []).map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingLeft: '12px' }}>
                <input type="text" value={opt.id} onChange={(e) => { const sqs = [...cs.subQuestions]; const opts = [...sqs[si].options]; opts[oi] = { ...opts[oi], id: e.target.value }; sqs[si] = { ...sqs[si], options: opts }; setCS({ subQuestions: sqs }); }} style={{ width: '40px', borderRadius: 'var(--rr-r-sm)', padding: '6px', fontSize: '12px', border: '1px solid var(--rr-border)', background: 'var(--rr-bg)', color: 'var(--rr-fg)', textAlign: 'center', outline: 'none' }} />
                <input type="text" value={opt.text || ''} onChange={(e) => { const sqs = [...cs.subQuestions]; const opts = [...sqs[si].options]; opts[oi] = { ...opts[oi], text: e.target.value }; sqs[si] = { ...sqs[si], options: opts }; setCS({ subQuestions: sqs }); }} style={{ flex: 1, ...inputStyle }} />
                <button onClick={() => { const sqs = [...cs.subQuestions]; sqs[si] = { ...sqs[si], options: sqs[si].options.filter((_, i) => i !== oi) }; setCS({ subQuestions: sqs }); }} style={{ background: 'none', border: 'none', color: 'var(--rr-fg-muted)', cursor: 'pointer' }}><X size={12} /></button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => { const sqs = [...cs.subQuestions]; const opts = sqs[si].options || []; sqs[si] = { ...sqs[si], options: [...opts, { id: String.fromCharCode(65 + opts.length), text: '' }] }; setCS({ subQuestions: sqs }); }} style={{ alignSelf: 'flex-start' }}><Plus size={12} /> Add Option</button>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--rr-fg-muted)', fontWeight: 500 }}>Correct Answer(s)</label>
              <input type="text" value={sq.correctAnswer?.join(', ') || ''} onChange={(e) => { const sqs = [...cs.subQuestions]; sqs[si] = { ...sqs[si], correctAnswer: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }; setCS({ subQuestions: sqs }); }} style={inputStyle} placeholder="e.g. A" />
            </div>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" onClick={() => setCS({ subQuestions: [...(cs.subQuestions || []), { question: '', options: [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }], correctAnswer: [] }] })} style={{ alignSelf: 'flex-start' }}><Plus size={14} /> Add Sub-Question</button>
      </div>
    );
  };

  const renderTypeFields = () => {
    switch (data.questionType) {
      case 'MCQ':
        return <><div style={{marginBottom: '12px'}}>{renderOptions()}</div>{renderCorrectAnswer(false)}</>;
      case 'MULTI_CORRECT':
        return <><div style={{marginBottom: '12px'}}>{renderOptions()}</div>{renderCorrectAnswer(true)}</>;
      case 'ASSERTION_REASON':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Assertion Statement</label><textarea value={data.assertionStatement || ''} onChange={(e) => set('assertionStatement', e.target.value)} style={inputStyle} rows={2} /></div>
            <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Reason Statement</label><textarea value={data.reasonStatement || ''} onChange={(e) => set('reasonStatement', e.target.value)} style={inputStyle} rows={2} /></div>
            {renderOptions()}
            {renderCorrectAnswer(false)}
          </div>
        );
      case 'CASE_BASED':
        return <><div style={{marginBottom: '12px'}}>{renderCaseStudy()}</div>{renderOptions()}<div style={{marginTop: '12px'}}>{renderCorrectAnswer(true)}</div></>;
      case 'MATCH_THE_FOLLOWING':
        return <><div style={{marginBottom: '12px'}}>{renderMatchPairs()}</div>{renderOptions()}<div style={{marginTop: '12px'}}>{renderCorrectAnswer(false)}</div></>;
      case 'TRUE_FALSE':
        return (
          <div>
            <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Correct Answer</label>
            <Select 
              value={data.correctAnswer?.[0] || ''} 
              onChange={(v) => set('correctAnswer', [v])} 
              options={[{value: 'True', label: 'True'}, {value: 'False', label: 'False'}]} 
              placeholder="Select" 
            />
          </div>
        );
      case 'DIAGRAM_BASED':
        return <><div style={{marginBottom: '12px'}}>{renderOptions()}</div>{renderCorrectAnswer(false)}</>;
      default:
        return null;
    }
  };

  const fieldsetCls = { background: 'var(--rr-surface)', borderRadius: 'var(--rr-r-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--rr-border)' };
  const legendCls = { fontSize: '11px', fontWeight: 'bold', color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '8px' }}>
      {/* Classification */}
      <div style={fieldsetCls}>
        <div style={legendCls}>Classification</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Question Type</label>
            <Select value={data.questionType || ''} onChange={(v) => set('questionType', v)} options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
          </div>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Difficulty</label>
            <Select value={data.difficulty || ''} onChange={(v) => set('difficulty', v)} options={['Easy', 'Medium', 'Hard', 'Expert'].map(d => ({ value: d, label: d }))} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Class</label><Combobox value={data.class || ''} onChange={(v) => set('class', v)} options={toOptions(filters.classes)} placeholder="e.g. 12" /></div>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Subject</label><Combobox value={data.subject || ''} onChange={(v) => set('subject', v)} options={toOptions(filters.subjects)} placeholder="e.g. Biology" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Unit</label><Combobox value={data.unit || ''} onChange={(v) => set('unit', v)} options={[]} placeholder="e.g. Ecology" /></div>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Chapter</label><Combobox value={data.chapter || ''} onChange={(v) => set('chapter', v)} options={toOptions(filters.chapters)} placeholder="e.g. Genetics" /></div>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Topic</label><Combobox value={data.topic || ''} onChange={(v) => set('topic', v)} options={toOptions(filters.topics)} placeholder="e.g. Cell Division" /></div>
        </div>
        <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Sub-Topic</label><Combobox value={data.subTopic || ''} onChange={(v) => set('subTopic', v)} options={[]} placeholder="e.g. Meiosis" /></div>
        <TagInput label="Exam Types" value={data.examType || []} onChange={(v) => set('examType', v)} placeholder="e.g. NEET, JEE" />
      </div>

      {/* Question Content */}
      <div style={fieldsetCls}>
        <div style={legendCls}>Question Content</div>
        <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Question Text</label><textarea value={data.question || ''} onChange={(e) => set('question', e.target.value)} rows={3} style={inputStyle} /></div>
        <div>
          <label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Question Image</label>
          {data.questionImageUrl ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img src={data.questionImageUrl} alt="Question" style={{ maxHeight: '128px', borderRadius: 'var(--rr-r-md)', border: '1px solid var(--rr-border)' }} />
              <button onClick={() => set('questionImageUrl', null)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--rr-coral-500)', color: 'white', border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}><X size={12} /></button>
            </div>
          ) : (
            <div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
              <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <ImageIcon size={14} /> {uploading ? 'Uploading...' : 'Upload Image'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Type-specific fields */}
      <div style={fieldsetCls}>
        <div style={legendCls}>{TYPE_LABELS[data.questionType] || 'Type'} Fields</div>
        {renderTypeFields()}
      </div>

      {/* Scoring */}
      <div style={fieldsetCls}>
        <div style={legendCls}>Scoring</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Time (s)</label><input type="number" value={data.estimatedTimeSeconds ?? ''} onChange={(e) => set('estimatedTimeSeconds', +e.target.value)} style={inputStyle} /></div>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Marks</label><input type="number" value={data.marks ?? ''} onChange={(e) => set('marks', +e.target.value)} style={inputStyle} /></div>
          <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Neg. Marks</label><input type="number" step="0.25" value={data.negativeMarks ?? ''} onChange={(e) => set('negativeMarks', +e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* Explanation */}
      <div style={fieldsetCls}>
        <div style={legendCls}>Explanation</div>
        <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)' }}>Correct Explanation</label><textarea value={data.answerExplanation?.correctExplanation || ''} onChange={(e) => set('answerExplanation', { ...(data.answerExplanation || {}), correctExplanation: e.target.value })} rows={2} style={inputStyle} /></div>
      </div>

      {/* Tags & Metadata */}
      <div style={fieldsetCls}>
        <div style={legendCls}>Tags & Metadata</div>
        <TagInput label="PYQ Tags" value={data.PYQ_tags || []} onChange={(v) => set('PYQ_tags', v)} placeholder="e.g. NEET 2023" />
        <TagInput label="Tags" value={data.tags || []} onChange={(v) => set('tags', v)} placeholder="e.g. important" />
        <TagInput label="Common Misconceptions" value={data.commonMisconceptions || []} onChange={(v) => set('commonMisconceptions', v)} placeholder="Add a misconception" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', paddingTop: '4px' }}>
          {[['isDiagramBased', 'Diagram Based'], ['isCaseBased', 'Case Based'], ['isNcertLineBased', 'NCERT Line Based']].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--rr-fg-muted)', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!data[key]} onChange={(e) => set(key, e.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div><label className={labelCls} style={{ color: 'var(--rr-fg-muted)', marginTop: '12px' }}>Question ID</label><input type="text" value={data.questionId || ''} readOnly disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} /></div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--rr-border)' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(data)}>Save Changes</button>
      </div>
    </div>
  );
}
