import { useState, useRef } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import Button from '../common/Button';
import { questionsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { TYPE_LABELS } from '../../utils/constants';

export default function QuestionEditor({ question, onSave, onCancel }) {
  const [data, setData] = useState({ ...question });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await questionsAPI.uploadImage(formData);
      const url = res.data?.url || res.url;
      handleChange('questionImageUrl', url);
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error('Image upload failed');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (data.questionType) {
      case 'MCQ':
      case 'MULTI_CORRECT':
        return (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-dark-300">Options</label>
            {data.options?.map((opt, idx) => (
              <div key={opt.id} className="flex gap-2 items-center">
                <span className="text-dark-400 font-mono text-xs">{opt.id}</span>
                <input
                  type="text"
                  value={opt.text || ''}
                  onChange={(e) => {
                    const newOpts = [...data.options];
                    newOpts[idx].text = e.target.value;
                    handleChange('options', newOpts);
                  }}
                  className="flex-1 rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white focus:border-accent-500/50"
                />
              </div>
            ))}
            <label className="block text-xs font-medium text-dark-300 mt-3">Correct Answer(s) (comma separated IDs)</label>
            <input
              type="text"
              value={data.correctAnswer?.join(',') || ''}
              onChange={(e) => handleChange('correctAnswer', e.target.value.split(',').map(s => s.trim()))}
              className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white focus:border-accent-500/50"
              placeholder="e.g. A or A,C"
            />
          </div>
        );
      case 'ASSERTION_REASON':
        return (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-dark-300">Assertion</label>
            <textarea
              value={data.assertionStatement || ''}
              onChange={(e) => handleChange('assertionStatement', e.target.value)}
              className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white focus:border-accent-500/50"
            />
            <label className="block text-xs font-medium text-dark-300">Reason</label>
            <textarea
              value={data.reasonStatement || ''}
              onChange={(e) => handleChange('reasonStatement', e.target.value)}
              className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white focus:border-accent-500/50"
            />
            <label className="block text-xs font-medium text-dark-300 mt-3">Correct Answer Option ID</label>
            <input
              type="text"
              value={data.correctAnswer?.[0] || ''}
              onChange={(e) => handleChange('correctAnswer', [e.target.value])}
              className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white focus:border-accent-500/50"
            />
          </div>
        );
      default:
        return <p className="text-xs text-dark-500 italic">Advanced editing for {TYPE_LABELS[data.questionType] || data.questionType} is handled in raw data format currently.</p>;
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Question Type</label>
          <select
            value={data.questionType || ''}
            onChange={(e) => handleChange('questionType', e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
            disabled
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Difficulty</label>
          <select
            value={data.difficulty || ''}
            onChange={(e) => handleChange('difficulty', e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
          >
            {['Easy', 'Medium', 'Hard', 'Expert'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-dark-300 mb-1.5">Question Text</label>
        <textarea
          value={data.question || ''}
          onChange={(e) => handleChange('question', e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-dark-300 mb-1.5">Question Image</label>
        {data.questionImageUrl ? (
          <div className="relative inline-block">
            <img src={data.questionImageUrl} alt="Question" className="max-h-32 rounded-lg border border-dark-600" />
            <button
              onClick={() => handleChange('questionImageUrl', null)}
              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
            <Button
              variant="secondary"
              size="sm"
              icon={ImageIcon}
              onClick={() => fileInputRef.current?.click()}
              loading={uploading}
            >
              Upload Image
            </Button>
          </div>
        )}
      </div>

      {renderTypeSpecificFields()}

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Topic</label>
          <input
            type="text"
            value={data.topic || ''}
            onChange={(e) => handleChange('topic', e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Sub-Topic</label>
          <input
            type="text"
            value={data.subTopic || ''}
            onChange={(e) => handleChange('subTopic', e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Time (s)</label>
          <input
            type="number"
            value={data.estimatedTimeSeconds || ''}
            onChange={(e) => handleChange('estimatedTimeSeconds', +e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Marks</label>
          <input
            type="number"
            value={data.marks || ''}
            onChange={(e) => handleChange('marks', +e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1.5">Neg. Marks</label>
          <input
            type="number"
            step="0.25"
            value={data.negativeMarks || ''}
            onChange={(e) => handleChange('negativeMarks', +e.target.value)}
            className="w-full rounded-xl border border-dark-600/50 bg-dark-800/50 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-dark-700/50 mt-4">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(data)}>Save Changes</Button>
      </div>
    </div>
  );
}
