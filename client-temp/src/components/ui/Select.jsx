import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'
import './Select.css'

// How much vertical breathing room we want between the dropdown and the
// viewport edge. If the dropdown can't fit *below* the trigger without
// breaking this margin, we flip it above instead.
const VIEWPORT_GUTTER_PX = 12

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
  // Dropdown screen position when portaled to <body>. We compute it
  // from the trigger's bounding rect on open + on scroll/resize, so
  // the dropdown follows its anchor even when the parent (e.g. a Modal
  // body with overflow:hidden) would otherwise clip it.
  const [dropdownPos, setDropdownPos] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const typeBufferRef = useRef('')
  const typeTimerRef = useRef(null)

  const selected = options.find(o => o.value === value)

  // Outside-click closer. Because the dropdown is portaled into <body>
  // it's NOT inside rootRef — we explicitly check listRef too, otherwise
  // every click inside the dropdown would close it.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (rootRef.current && rootRef.current.contains(e.target)) return
      if (listRef.current && listRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Compute the dropdown's fixed-position coords from the trigger rect.
  // Decides whether to drop down or flip up based on viewport space.
  const recomputePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER_PX
    const spaceAbove = rect.top - VIEWPORT_GUTTER_PX
    // The CSS max-height is 280px; we use a slightly smaller heuristic
    // so we don't keep flipping on tiny differences.
    const ESTIMATED_HEIGHT = 280
    const placeAbove = spaceBelow < Math.min(ESTIMATED_HEIGHT, 200) && spaceAbove > spaceBelow
    const maxH = Math.max(
      120,
      Math.min(ESTIMATED_HEIGHT, placeAbove ? spaceAbove : spaceBelow),
    )
    setDropdownPos({
      top: placeAbove ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      maxHeight: maxH,
      placeAbove,
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined
    recomputePosition()
    // Re-anchor on scroll/resize. Capture: true so we catch scroll
    // events in any ancestor (including the modal body's own scroll).
    const onSync = () => recomputePosition()
    window.addEventListener('scroll', onSync, true)
    window.addEventListener('resize', onSync)
    return () => {
      window.removeEventListener('scroll', onSync, true)
      window.removeEventListener('resize', onSync)
    }
  }, [open, recomputePosition])

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
        ref={triggerRef}
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
      {open && dropdownPos && createPortal(
        <ul
          className={`rr-select-list rr-select-list--portal${dropdownPos.placeAbove ? ' rr-select-list--above' : ''} ${listClassName}`}
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
        </ul>,
        document.body,
      )}
    </div>
  )
}
