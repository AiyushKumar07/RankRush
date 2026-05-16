import { useState, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Trash2 } from 'lucide-react';
import Button from '../common/Button';
import { questionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { TYPE_LABELS } from '../../utils/constants';

const inputCls = 'w-full rounded-xl glass-input px-3.5 py-2.5 text-sm text-white focus:outline-none';
const labelCls = 'block text-[11px] font-semibold text-dark-400 mb-2 uppercase tracking-wider';

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
      <label className={labelCls}>{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((t, i) => (
          <span key={i} className="flex items-center gap-1.5 rounded-lg glass-frosted px-2.5 py-1 text-xs text-dark-200">
            {t}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-dark-500 hover:text-red-400 transition-colors"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder || 'Type and press Enter'} className={inputCls} />
        <Button variant="secondary" size="sm" onClick={add} type="button">Add</Button>
      </div>
    </div>
  );
}

export default function QuestionEditor({ question, onSave, onCancel }) {
  const [data, setData] = useState({ ...question });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const set = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

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
    <div className="space-y-2.5">
      <label className={labelCls}>Options</label>
      {(data.options || []).map((opt, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input type="text" value={opt.id} onChange={(e) => { const o = [...data.options]; o[idx] = { ...o[idx], id: e.target.value }; set('options', o); }} className="w-14 rounded-xl glass-input px-2 py-2.5 text-xs text-white text-center" placeholder="ID" />
          <input type="text" value={opt.text || ''} onChange={(e) => { const o = [...data.options]; o[idx] = { ...o[idx], text: e.target.value }; set('options', o); }} className={'flex-1 ' + inputCls} placeholder="Option text" />
          <button onClick={() => set('options', data.options.filter((_, i) => i !== idx))} className="text-dark-500 hover:text-red-400 transition-colors p-1"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button variant="ghost" size="sm" icon={Plus} onClick={() => set('options', [...(data.options || []), { id: String.fromCharCode(65 + (data.options?.length || 0)), text: '' }])}>Add Option</Button>
    </div>
  );

  const renderCorrectAnswer = (multi) => (
    <div>
      <label className={labelCls}>{multi ? 'Correct Answers (comma separated IDs)' : 'Correct Answer'}</label>
      <input type="text" value={data.correctAnswer?.join(', ') || ''} onChange={(e) => set('correctAnswer', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className={inputCls} placeholder={multi ? 'e.g. A, C' : 'e.g. A'} />
    </div>
  );

  const renderMatchPairs = () => (
    <div className="space-y-2.5">
      <label className={labelCls}>Match Pairs</label>
      {(data.matchPairs || []).map((pair, idx) => (
        <div key={idx} className="flex gap-2 items-center">
          <input type="text" value={pair.left || ''} onChange={(e) => { const p = [...data.matchPairs]; p[idx] = { ...p[idx], left: e.target.value }; set('matchPairs', p); }} className={'flex-1 ' + inputCls} placeholder="Left" />
          <span className="text-dark-500 text-sm">↔</span>
          <input type="text" value={pair.right || ''} onChange={(e) => { const p = [...data.matchPairs]; p[idx] = { ...p[idx], right: e.target.value }; set('matchPairs', p); }} className={'flex-1 ' + inputCls} placeholder="Right" />
          <button onClick={() => set('matchPairs', data.matchPairs.filter((_, i) => i !== idx))} className="text-dark-500 hover:text-red-400 transition-colors p-1"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <Button variant="ghost" size="sm" icon={Plus} onClick={() => set('matchPairs', [...(data.matchPairs || []), { left: '', right: '' }])}>Add Pair</Button>
    </div>
  );

  const renderCaseStudy = () => {
    const cs = data.caseStudy || { passage: '', subQuestions: [] };
    const setCS = (updates) => set('caseStudy', { ...cs, ...updates });
    return (
      <div className="space-y-3 rounded-xl border border-amber-500/15 bg-amber-500/[0.03] p-4 backdrop-blur-sm">
        <label className={labelCls}>Case Study Passage</label>
        <textarea value={cs.passage || ''} onChange={(e) => setCS({ passage: e.target.value })} rows={3} className={inputCls} />
        <label className={labelCls}>Sub-Questions</label>
        {(cs.subQuestions || []).map((sq, si) => (
          <div key={si} className="rounded-xl glass-frosted p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-dark-400 font-semibold">Sub-Q {si + 1}</span>
              <button onClick={() => setCS({ subQuestions: cs.subQuestions.filter((_, i) => i !== si) })} className="text-dark-500 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            <input type="text" value={sq.question || ''} onChange={(e) => { const sqs = [...cs.subQuestions]; sqs[si] = { ...sqs[si], question: e.target.value }; setCS({ subQuestions: sqs }); }} className={inputCls} placeholder="Sub-question text" />
            {(sq.options || []).map((opt, oi) => (
              <div key={oi} className="flex gap-2 items-center pl-3">
                <input type="text" value={opt.id} onChange={(e) => { const sqs = [...cs.subQuestions]; const opts = [...sqs[si].options]; opts[oi] = { ...opts[oi], id: e.target.value }; sqs[si] = { ...sqs[si], options: opts }; setCS({ subQuestions: sqs }); }} className="w-12 rounded-xl glass-input px-2 py-2 text-xs text-white text-center" />
                <input type="text" value={opt.text || ''} onChange={(e) => { const sqs = [...cs.subQuestions]; const opts = [...sqs[si].options]; opts[oi] = { ...opts[oi], text: e.target.value }; sqs[si] = { ...sqs[si], options: opts }; setCS({ subQuestions: sqs }); }} className={'flex-1 ' + inputCls} />
                <button onClick={() => { const sqs = [...cs.subQuestions]; sqs[si] = { ...sqs[si], options: sqs[si].options.filter((_, i) => i !== oi) }; setCS({ subQuestions: sqs }); }} className="text-dark-500 hover:text-red-400 transition-colors"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <Button variant="ghost" size="sm" icon={Plus} onClick={() => { const sqs = [...cs.subQuestions]; const opts = sqs[si].options || []; sqs[si] = { ...sqs[si], options: [...opts, { id: String.fromCharCode(65 + opts.length), text: '' }] }; setCS({ subQuestions: sqs }); }}>Add Option</Button>
            <div>
              <label className="text-[10px] text-dark-400 font-medium">Correct Answer(s)</label>
              <input type="text" value={sq.correctAnswer?.join(', ') || ''} onChange={(e) => { const sqs = [...cs.subQuestions]; sqs[si] = { ...sqs[si], correctAnswer: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }; setCS({ subQuestions: sqs }); }} className={inputCls} placeholder="e.g. A" />
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" icon={Plus} onClick={() => setCS({ subQuestions: [...(cs.subQuestions || []), { question: '', options: [{ id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }], correctAnswer: [] }] })}>Add Sub-Question</Button>
      </div>
    );
  };

  const renderTypeFields = () => {
    switch (data.questionType) {
      case 'MCQ':
        return <>{renderOptions()}{renderCorrectAnswer(false)}</>;
      case 'MULTI_CORRECT':
        return <>{renderOptions()}{renderCorrectAnswer(true)}</>;
      case 'ASSERTION_REASON':
        return (
          <div className="space-y-3">
            <div><label className={labelCls}>Assertion Statement</label><textarea value={data.assertionStatement || ''} onChange={(e) => set('assertionStatement', e.target.value)} className={inputCls} rows={2} /></div>
            <div><label className={labelCls}>Reason Statement</label><textarea value={data.reasonStatement || ''} onChange={(e) => set('reasonStatement', e.target.value)} className={inputCls} rows={2} /></div>
            {renderOptions()}
            {renderCorrectAnswer(false)}
          </div>
        );
      case 'CASE_BASED':
        return <>{renderCaseStudy()}{renderOptions()}{renderCorrectAnswer(true)}</>;
      case 'MATCH_THE_FOLLOWING':
        return <>{renderMatchPairs()}{renderOptions()}{renderCorrectAnswer(false)}</>;
      case 'TRUE_FALSE':
        return (
          <div>
            <label className={labelCls}>Correct Answer</label>
            <select value={data.correctAnswer?.[0] || ''} onChange={(e) => set('correctAnswer', [e.target.value])} className={inputCls}>
              <option value="">Select</option>
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          </div>
        );
      case 'DIAGRAM_BASED':
        return <>{renderOptions()}{renderCorrectAnswer(false)}</>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
      {/* Classification */}
      <fieldset className="rounded-2xl glass-frosted p-5 space-y-3.5">
        <legend className="text-xs font-bold text-dark-300 px-2 uppercase tracking-wider">Classification</legend>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Question Type</label>
            <select value={data.questionType || ''} onChange={(e) => set('questionType', e.target.value)} className={inputCls}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Difficulty</label>
            <select value={data.difficulty || ''} onChange={(e) => set('difficulty', e.target.value)} className={inputCls}>
              {['Easy', 'Medium', 'Hard', 'Expert'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Class</label><input type="text" value={data.class || ''} onChange={(e) => set('class', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Subject</label><input type="text" value={data.subject || ''} onChange={(e) => set('subject', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Unit</label><input type="text" value={data.unit || ''} onChange={(e) => set('unit', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Chapter</label><input type="text" value={data.chapter || ''} onChange={(e) => set('chapter', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Topic</label><input type="text" value={data.topic || ''} onChange={(e) => set('topic', e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Sub-Topic</label><input type="text" value={data.subTopic || ''} onChange={(e) => set('subTopic', e.target.value)} className={inputCls} /></div>
        <TagInput label="Exam Types" value={data.examType || []} onChange={(v) => set('examType', v)} placeholder="e.g. NEET, JEE" />
      </fieldset>

      {/* Question Content */}
      <fieldset className="rounded-2xl glass-frosted p-5 space-y-3.5">
        <legend className="text-xs font-bold text-dark-300 px-2 uppercase tracking-wider">Question Content</legend>
        <div><label className={labelCls}>Question Text</label><textarea value={data.question || ''} onChange={(e) => set('question', e.target.value)} rows={3} className={inputCls} /></div>
        <div>
          <label className={labelCls}>Question Image</label>
          {data.questionImageUrl ? (
            <div className="relative inline-block">
              <img src={data.questionImageUrl} alt="Question" className="max-h-32 rounded-xl border border-white/[0.06]" />
              <button onClick={() => set('questionImageUrl', null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 transition-colors"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              <Button variant="secondary" size="sm" icon={ImageIcon} onClick={() => fileInputRef.current?.click()} loading={uploading}>Upload Image</Button>
            </div>
          )}
        </div>
      </fieldset>

      {/* Type-specific fields */}
      <fieldset className="rounded-2xl glass-frosted p-5 space-y-3.5">
        <legend className="text-xs font-bold text-dark-300 px-2 uppercase tracking-wider">{TYPE_LABELS[data.questionType] || 'Type'} Fields</legend>
        {renderTypeFields()}
      </fieldset>

      {/* Scoring */}
      <fieldset className="rounded-2xl glass-frosted p-5 space-y-3.5">
        <legend className="text-xs font-bold text-dark-300 px-2 uppercase tracking-wider">Scoring</legend>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Time (s)</label><input type="number" value={data.estimatedTimeSeconds ?? ''} onChange={(e) => set('estimatedTimeSeconds', +e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Marks</label><input type="number" value={data.marks ?? ''} onChange={(e) => set('marks', +e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Neg. Marks</label><input type="number" step="0.25" value={data.negativeMarks ?? ''} onChange={(e) => set('negativeMarks', +e.target.value)} className={inputCls} /></div>
        </div>
      </fieldset>

      {/* Explanation */}
      <fieldset className="rounded-2xl glass-frosted p-5 space-y-3.5">
        <legend className="text-xs font-bold text-dark-300 px-2 uppercase tracking-wider">Explanation</legend>
        <div><label className={labelCls}>Correct Explanation</label><textarea value={data.answerExplanation?.correctExplanation || ''} onChange={(e) => set('answerExplanation', { ...(data.answerExplanation || {}), correctExplanation: e.target.value })} rows={2} className={inputCls} /></div>
      </fieldset>

      {/* Tags & Metadata */}
      <fieldset className="rounded-2xl glass-frosted p-5 space-y-3.5">
        <legend className="text-xs font-bold text-dark-300 px-2 uppercase tracking-wider">Tags & Metadata</legend>
        <TagInput label="PYQ Tags" value={data.PYQ_tags || []} onChange={(v) => set('PYQ_tags', v)} placeholder="e.g. NEET 2023" />
        <TagInput label="Tags" value={data.tags || []} onChange={(v) => set('tags', v)} placeholder="e.g. important" />
        <TagInput label="Common Misconceptions" value={data.commonMisconceptions || []} onChange={(v) => set('commonMisconceptions', v)} placeholder="Add a misconception" />
        <div className="flex flex-wrap gap-4 pt-1">
          {[['isDiagramBased', 'Diagram Based'], ['isCaseBased', 'Case Based'], ['isNcertLineBased', 'NCERT Line Based']].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-xs text-dark-200 cursor-pointer group">
              <input type="checkbox" checked={!!data[key]} onChange={(e) => set(key, e.target.checked)} className="rounded border-dark-600 bg-dark-800/50 text-accent-500 focus:ring-accent-500/30 accent-accent-500" />
              <span className="group-hover:text-white transition-colors">{label}</span>
            </label>
          ))}
        </div>
        <div><label className={labelCls}>Question ID</label><input type="text" value={data.questionId || ''} readOnly disabled className={inputCls + ' opacity-40 cursor-not-allowed'} /></div>
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.04]">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(data)}>Save Changes</Button>
      </div>
    </div>
  );
}
