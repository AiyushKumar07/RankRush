import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import './Select.css';

const VIEWPORT_GUTTER_PX = 12;

export default function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Type or select…',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState(null);
  
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter options based on current input value
  const filteredOptions = options.filter(opt => 
    (opt.label || '').toLowerCase().includes((value || '').toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      if (listRef.current && listRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const recomputePosition = useCallback(() => {
    const trigger = rootRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER_PX;
    const spaceAbove = rect.top - VIEWPORT_GUTTER_PX;
    const ESTIMATED_HEIGHT = 280;
    const placeAbove = spaceBelow < Math.min(ESTIMATED_HEIGHT, 200) && spaceAbove > spaceBelow;
    const maxH = Math.max(
      120,
      Math.min(ESTIMATED_HEIGHT, placeAbove ? spaceAbove : spaceBelow),
    );
    setDropdownPos({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxHeight: maxH,
      placeAbove,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    recomputePosition();
    const onSync = () => recomputePosition();
    window.addEventListener('scroll', onSync, true);
    window.addEventListener('resize', onSync);
    return () => {
      window.removeEventListener('scroll', onSync, true);
      window.removeEventListener('resize', onSync);
    };
  }, [open, recomputePosition]);

  useEffect(() => {
    if (!open) return;
    setActiveIdx(filteredOptions.length > 0 ? 0 : -1);
  }, [open, value]); // Reset active index when typing or opening

  useEffect(() => {
    if (!open || activeIdx < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const choose = useCallback((v) => {
    onChange(v);
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(filteredOptions.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filteredOptions[activeIdx];
      if (opt) {
        choose(opt.value);
      } else {
        setOpen(false);
        inputRef.current?.blur();
      }
      return;
    }
  };

  return (
    <div
      className={`rr-select ${className} ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
      ref={rootRef}
      onKeyDown={onKeyDown}
    >
      <div className="rr-select-trigger" onClick={() => { if(!disabled) { setOpen(true); inputRef.current?.focus(); } }} style={{ paddingRight: '36px' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--rr-fg)',
            fontFamily: 'inherit',
            fontSize: 'inherit'
          }}
        />
        <ChevronDown size={14} className="rr-select-chevron" />
      </div>
      
      {open && dropdownPos && createPortal(
        <ul
          className={`rr-select-list rr-select-list--portal${dropdownPos.placeAbove ? ' rr-select-list--above' : ''}`}
          role="listbox"
          ref={listRef}
          style={{
            position: 'fixed',
            top: dropdownPos.placeAbove ? 'auto' : dropdownPos.top,
            bottom: dropdownPos.placeAbove
              ? window.innerHeight - dropdownPos.top
              : 'auto',
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: dropdownPos.maxHeight,
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive = i === activeIdx;
              return (
                <li
                  key={`${opt.value}-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  className={`rr-select-option${isSelected ? ' selected' : ''}${isActive ? ' active' : ''}`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => choose(opt.value)}
                >
                  <span className="rr-select-option-label">
                    {opt.label}
                  </span>
                  {isSelected && <Check size={14} className="rr-select-check" />}
                </li>
              );
            })
          ) : (
            <li className="rr-select-option" style={{ color: 'var(--rr-fg-muted)', cursor: 'default' }}>
              <span className="rr-select-option-label">
                {value ? `Use "${value}"` : 'Type to create'}
              </span>
            </li>
          )}
        </ul>,
        document.body,
      )}
    </div>
  );
}
