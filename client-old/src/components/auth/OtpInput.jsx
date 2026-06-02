import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function OtpInput({ length = 6, onComplete, disabled = false }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function handleChange(index, val) {
    if (disabled) return;
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[index] = char;
    setValues(next);

    if (char && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }

    const code = next.join('');
    if (code.length === length && !next.includes('')) {
      onComplete?.(code);
    }
  }

  function handleKeyDown(index, e) {
    if (disabled) return;
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const next = [...values];
      next[index - 1] = '';
      setValues(next);
    }
  }

  function handlePaste(e) {
    if (disabled) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const next = [...values];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setValues(next);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputs.current[focusIdx]?.focus();
    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3">
      {values.map((v, i) => (
        <motion.input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={v}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`
            w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold rounded-xl
            glass-input text-white placeholder-dark-600 focus:outline-none
            transition-all duration-200
            ${v ? 'border-accent-400/40 shadow-[0_0_12px_rgba(124,107,245,0.15)]' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
      ))}
    </div>
  );
}
