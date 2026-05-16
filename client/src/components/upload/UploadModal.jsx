import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, CheckCircle2, FileWarning, Sparkles, Copy } from 'lucide-react';
import { questionsAPI } from '../../services/api';
import Modal from '../common/Modal';
import Button from '../common/Button';
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
    const template = JSON.stringify({ quizBank: [] }, null, 2);
    setJsonContent(template);
    setFileName('template.json');
    toast.success('Template loaded');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Questions" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative glass-card rounded-2xl p-8 text-center cursor-pointer transition-all duration-400 overflow-hidden ${
            dragActive ? 'border-accent-500/40 scale-[1.01]' : ''
          }`}
        >
          {dragActive && (
            <div className="absolute inset-0 bg-accent-500/[0.06] backdrop-blur-sm" />
          )}
          <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-accent-400/10 to-transparent" />
          <input ref={fileRef} type="file" accept=".json" onChange={(e) => handleFile(e.target.files[0])} className="hidden" />
          <motion.div animate={{ y: dragActive ? -6 : 0 }} className="relative flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-accent-500/15 blur-xl" />
              <div className="relative rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/10 p-5 border border-accent-400/10">
                <FileJson className="h-8 w-8 text-accent-300" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-dark-100">{fileName || 'Drop JSON file here, or click to browse'}</p>
              <p className="text-xs text-dark-500 mt-1.5">Supports .json files with quizBank array</p>
            </div>
          </motion.div>
        </div>

        {/* JSON editor */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
            <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider">JSON Content</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={Sparkles} onClick={handlePasteTemplate}>Template</Button>
              <Button variant="ghost" size="sm" icon={Copy} onClick={() => { navigator.clipboard.writeText(jsonContent); toast.success('Copied!'); }}>Copy</Button>
            </div>
          </div>
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            rows={10}
            placeholder='{\n  "quizBank": [\n    { ... }\n  ]\n}'
            className="w-full bg-dark-950/50 px-5 py-4 font-mono text-xs text-dark-100 placeholder-dark-600 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <Button onClick={handleUpload} loading={uploading} icon={Upload} className="w-full" disabled={!jsonContent}>
          Upload Questions
        </Button>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-6 space-y-4 relative overflow-hidden"
            >
              <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent" />
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {result.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <FileWarning className="h-5 w-5 text-amber-400" />}
                Upload Results
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <ResultStat value={result.totalReceived} label="Received" color="text-dark-100" />
                <ResultStat value={result.inserted} label="Inserted" color="text-emerald-400" />
                <ResultStat value={result.duplicates} label="Duplicates" color="text-amber-400" />
                <ResultStat value={result.errors?.length || 0} label="Errors" color="text-red-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}

function ResultStat({ value, label, color }) {
  return (
    <div className="rounded-xl glass-frosted p-3.5 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-dark-500 uppercase mt-1 font-medium tracking-wider">{label}</p>
    </div>
  );
}
