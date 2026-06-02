import { useState, useRef } from 'react';
import { Upload, FileJson, CheckCircle2, FileWarning, Sparkles, Copy, Loader2 } from 'lucide-react';
import { questionsAPI } from '../../services/api';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const [jsonContent, setJsonContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  const reset = () => {
    setJsonContent('');
    setFileName('');
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setJsonContent(text);
      try {
        JSON.parse(text);
        setResult(null);
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!jsonContent) {
      toast.error('No JSON content to upload');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch {
      toast.error('Invalid JSON');
      return;
    }

    if (!parsed.quizBank || !Array.isArray(parsed.quizBank)) {
      toast.error('JSON must contain a "quizBank" array');
      return;
    }

    setUploading(true);
    try {
      const res = await questionsAPI.upload({
        quizBank: parsed.quizBank,
        fileName: fileName || 'manual-input.json',
      });
      setResult(res.data);
      toast.success(`Uploaded ${res.data.inserted} questions`);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handlePasteTemplate = () => {
    const templateObj = {
      quizBank: [
        {
          examType: ["CBSE"],
          class: "12",
          subject: "Physics",
          chapter: "Electrostatics",
          topic: "Electric Charges",
          questionType: "MCQ",
          difficulty: "Medium",
          question: "What is the SI unit of electric charge?",
          options: [
            { id: "A", text: "Coulomb" },
            { id: "B", text: "Volt" },
            { id: "C", text: "Ampere" },
            { id: "D", text: "Ohm" }
          ],
          correctAnswer: ["A"],
          marks: 1,
          negativeMarks: 0,
          estimatedTimeSeconds: 60,
          answerExplanation: {
            correctExplanation: "The SI unit of electric charge is Coulomb."
          }
        }
      ]
    };
    const template = JSON.stringify(templateObj, null, 2);
    setJsonContent(template);
    setFileName('template.json');
    toast.success('Template loaded');
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Upload Questions" size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            position: 'relative',
            background: 'var(--rr-bg)',
            border: `2px dashed ${dragActive ? 'var(--rr-violet-500)' : 'var(--rr-border-strong)'}`,
            borderRadius: 'var(--rr-r-xl)',
            padding: '32px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all var(--rr-dur-base)'
          }}
        >
          <input ref={fileRef} type="file" accept=".json" onChange={(e) => handleFile(e.target.files[0])} style={{ display: 'none' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'var(--rr-violet-50)',
              color: 'var(--rr-violet-500)',
              padding: '16px',
              borderRadius: 'var(--rr-r-md)'
            }}>
              <FileJson size={32} />
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--rr-fg)' }}>
                {fileName || 'Drop JSON file here, or click to browse'}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--rr-fg-muted)' }}>
                Supports .json files with quizBank array
              </p>
            </div>
          </div>
        </div>

        {/* JSON editor */}
        <div style={{ background: 'var(--rr-bg)', border: '1px solid var(--rr-border)', borderRadius: 'var(--rr-r-lg)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--rr-border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>JSON Content</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handlePasteTemplate}>
                <Sparkles size={12} /> Template
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(jsonContent); toast.success('Copied!'); }}>
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            rows={10}
            placeholder='{\n  "quizBank": [\n    { ... }\n  ]\n}'
            style={{
              width: '100%',
              background: 'var(--rr-bg-alt)',
              padding: '16px',
              fontFamily: 'var(--rr-font-mono)',
              fontSize: '12px',
              color: 'var(--rr-fg)',
              border: 'none',
              outline: 'none',
              resize: 'none'
            }}
            spellCheck={false}
          />
        </div>

        <button className="btn btn-accent" onClick={handleUpload} disabled={!jsonContent || uploading} style={{ width: '100%' }}>
          {uploading ? <Loader2 size={16} className="aq-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading...' : 'Upload Questions'}
        </button>

        {/* Results */}
        {result && (
          <div style={{
            background: result.status === 'COMPLETED' ? 'rgba(34,197,94,0.08)' : 'rgba(245,166,35,0.08)',
            border: `1px solid ${result.status === 'COMPLETED' ? 'var(--rr-emerald-500)' : 'var(--rr-amber-500)'}`,
            borderRadius: 'var(--rr-r-md)',
            padding: '20px'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', margin: '0 0 16px' }}>
              {result.status === 'COMPLETED' ? <CheckCircle2 size={18} color="var(--rr-emerald-500)" /> : <FileWarning size={18} color="var(--rr-amber-500)" />}
              Upload Results
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <ResultStat value={result.totalReceived} label="Received" color="var(--rr-fg)" />
              <ResultStat value={result.inserted} label="Inserted" color="var(--rr-emerald-500)" />
              <ResultStat value={result.duplicates} label="Duplicates" color="var(--rr-amber-500)" />
              <ResultStat value={result.errors?.length || 0} label="Errors" color="var(--rr-coral-500)" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ResultStat({ value, label, color }) {
  return (
    <div style={{ background: 'var(--rr-surface)', border: '1px solid var(--rr-border)', borderRadius: 'var(--rr-r-sm)', padding: '12px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 'bold', color }}>{value}</p>
      <p style={{ margin: 0, fontSize: '10px', color: 'var(--rr-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    </div>
  );
}
