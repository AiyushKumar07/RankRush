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
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`glass-card rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
            dragActive ? 'border-accent-500/50 bg-accent-500/5 scale-[1.01]' : 'hover:border-dark-500'
          }`}
        >
          <input ref={fileRef} type="file" accept=".json" onChange={(e) => handleFile(e.target.files[0])} className="hidden" />
          <motion.div animate={{ y: dragActive ? -4 : 0 }} className="flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-accent-500/10 p-4"><FileJson className="h-8 w-8 text-accent-400" /></div>
            <div>
              <p className="text-sm font-medium text-dark-100">{fileName || 'Drop JSON file here, or click to browse'}</p>
              <p className="text-xs text-dark-500 mt-1">Supports .json files with quizBank array</p>
            </div>
          </motion.div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50">
            <span className="text-xs text-dark-400 font-medium uppercase tracking-wider">JSON Content</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={Sparkles} onClick={handlePasteTemplate}>Template</Button>
              <Button variant="ghost" size="sm" icon={Copy} onClick={() => { navigator.clipboard.writeText(jsonContent); toast.success('Copied!'); }}>Copy</Button>
            </div>
          </div>
          <textarea
            value={jsonContent}
            onChange={(e) => {
              setJsonContent(e.target.value);
            }}
            rows={10}
            placeholder='{\n  "quizBank": [\n    { ... }\n  ]\n}'
            className="w-full bg-dark-900 px-4 py-3 font-mono text-xs text-dark-100 placeholder-dark-600 focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>

        <Button onClick={handleUpload} loading={uploading} icon={Upload} className="w-full" disabled={!jsonContent}>
          Upload Questions
        </Button>

        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                {result.status === 'COMPLETED' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <FileWarning className="h-5 w-5 text-amber-400" />}
                Upload Results
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-xl bg-dark-800/50 p-3 text-center"><p className="text-xl font-bold text-dark-100">{result.totalReceived}</p><p className="text-[10px] text-dark-500 uppercase mt-1">Received</p></div>
                <div className="rounded-xl bg-dark-800/50 p-3 text-center"><p className="text-xl font-bold text-emerald-400">{result.inserted}</p><p className="text-[10px] text-dark-500 uppercase mt-1">Inserted</p></div>
                <div className="rounded-xl bg-dark-800/50 p-3 text-center"><p className="text-xl font-bold text-amber-400">{result.duplicates}</p><p className="text-[10px] text-dark-500 uppercase mt-1">Duplicates</p></div>
                <div className="rounded-xl bg-dark-800/50 p-3 text-center"><p className="text-xl font-bold text-red-400">{result.errors?.length || 0}</p><p className="text-[10px] text-dark-500 uppercase mt-1">Errors</p></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
