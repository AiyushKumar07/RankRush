import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import './Select.css'

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
  triggerClassName = '',
  listClassName = '',
  renderOption,
  renderValue,
  ariaLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const typeBufferRef = useRef('')
  const typeTimerRef = useRef(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const idx = options.findIndex(o => o.value === value)
    setActiveIdx(idx >= 0 ? idx : 0)
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-idx="${idx >= 0 ? idx : 0}"]`)
      el?.scrollIntoView({ block: 'nearest' })
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || activeIdx < 0) return
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, open])

  const choose = useCallback((v) => {
    onChange(v)
    setOpen(false)
  }, [onChange])

  const onKeyDown = (e) => {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return }
    if (e.key === 'Tab') { setOpen(false); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(options.length - 1, i + 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); return }
    if (e.key === 'Home')      { e.preventDefault(); setActiveIdx(0); return }
    if (e.key === 'End')       { e.preventDefault(); setActiveIdx(options.length - 1); return }
    if (e.key === 'Enter') {
      e.preventDefault()
      const opt = options[activeIdx]
      if (opt) choose(opt.value)
      return
    }
    if (e.key.length === 1 && /\S/.test(e.key)) {
      typeBufferRef.current += e.key.toLowerCase()
      clearTimeout(typeTimerRef.current)
      typeTimerRef.current = setTimeout(() => { typeBufferRef.current = '' }, 600)
      const buf = typeBufferRef.current
      const i = options.findIndex(o => {
        const text = (o.searchText ?? (typeof o.label === 'string' ? o.label : '')).toString().toLowerCase()
        return text.startsWith(buf)
      })
      if (i >= 0) setActiveIdx(i)
    }
  }

  return (
    <div
      className={`rr-select ${className} ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
      ref={rootRef}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className={`rr-select-trigger ${triggerClassName}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className="rr-select-value">
          {selected
            ? (renderValue ? renderValue(selected) : selected.label)
            : <span className="rr-select-placeholder">{placeholder}</span>}
        </span>
        <ChevronDown size={14} className="rr-select-chevron" />
      </button>
      {open && (
        <ul
          className={`rr-select-list ${listClassName}`}
          role="listbox"
          ref={listRef}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isActive = i === activeIdx
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
                  {renderOption ? renderOption(opt) : opt.label}
                </span>
                {isSelected && <Check size={14} className="rr-select-check" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
