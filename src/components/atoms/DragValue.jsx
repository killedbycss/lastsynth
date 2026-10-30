import { useRef } from 'react'

export default function DragValue({ value, onChange, min = 0, max = 1, step = 0.01, options, label, variant = 'row', disabled = false, selected = false, onSelect }) {
  const drag = useRef(null)
  const adjust = (direction) => {
    if (disabled) return
    if (options) {
      const index = Math.max(0, options.indexOf(value))
      onChange(options[(index + direction + options.length) % options.length])
    } else {
      const next = Math.min(max, Math.max(min, Number((value + direction * step).toFixed(4))))
      onChange(next)
    }
  }
  const pointerDown = (event) => {
    if (disabled) return
    onSelect?.()
    drag.current = { x: event.clientX, carry: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
    window.dispatchEvent(new CustomEvent('ls-liquid-impact', { detail: { x: event.clientX, y: event.clientY, strength: 1 } }))
  }
  const pointerMove = (event) => {
    if (!drag.current || disabled) return
    const delta = event.clientX - drag.current.x + drag.current.carry
    const ticks = Math.trunc(delta / 14)
    if (ticks) {
      adjust(ticks)
      drag.current = { x: event.clientX, carry: delta - ticks * 14 }
    }
  }
  const pointerUp = (event) => {
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }
  const keyDown = (event) => {
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0
    if (!direction) return
    event.preventDefault()
    event.stopPropagation()
    adjust(direction)
  }
  const display = options ? value : Number(value).toFixed(2)
  return (
    <div className={`ls-drag-value ls-drag-value--${variant}${selected ? ' ls-drag-value--selected' : ''}${disabled ? ' ls-drag-value--disabled' : ''}`} role="slider" aria-label={label} aria-valuetext={String(display)} tabIndex={disabled ? -1 : 0} onFocus={onSelect} onKeyDown={keyDown} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDoubleClick={() => onSelect?.()}>
      {variant === 'row' && <button type="button" disabled={disabled} onClick={() => adjust(-1)} aria-label={`Decrease ${label}`}>−</button>}
      <output>{display}</output>
      {variant === 'row' && <button type="button" disabled={disabled} onClick={() => adjust(1)} aria-label={`Increase ${label}`}>+</button>}
      {label && <span>{label}</span>}
    </div>
  )
}
