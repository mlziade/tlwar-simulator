import React, { useEffect, useState } from 'react'
import { useEditor } from 'tldraw'

const DURATION_MS = 1100

const CSS = `
@keyframes tlwar-dmg {
  0%   { opacity: 1;   transform: translate(-50%, 0px)   scale(1.1); }
  15%  { opacity: 1;   transform: translate(-50%, -8px)  scale(1);   }
  100% { opacity: 0;   transform: translate(-50%, -52px) scale(0.85); }
}
.tlwar-dmg {
  animation: tlwar-dmg ${DURATION_MS}ms ease-out forwards;
  position: absolute;
  font-weight: 800;
  font-size: 13px;
  font-family: system-ui, -apple-system, sans-serif;
  color: #ff5252;
  text-shadow: 0 1px 4px rgba(0,0,0,0.7);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  line-height: 1;
}
`

type DmgEvent = { id: string; x: number; y: number; amount: number; t: number }

// Module-level emitter — called from SimulationLoop (outside React tree)
let _events: DmgEvent[] = []
let _listeners: Array<(events: DmgEvent[]) => void> = []

export function emitDamage(pageX: number, pageY: number, amount: number) {
  const ev: DmgEvent = { id: crypto.randomUUID(), x: pageX, y: pageY, amount, t: Date.now() }
  _events = [..._events, ev]
  _listeners.forEach(l => l(_events))
}

export function DamageNumbers() {
  const editor = useEditor()
  const [events, setEvents] = useState<DmgEvent[]>([])

  useEffect(() => {
    // Inject CSS once
    const styleId = 'tlwar-dmg-style'
    if (!document.getElementById(styleId)) {
      const el = document.createElement('style')
      el.id = styleId
      el.textContent = CSS
      document.head.appendChild(el)
    }

    _listeners.push(setEvents)

    // Prune expired events every 200ms
    const pruner = setInterval(() => {
      if (_events.length === 0) return
      const now = Date.now()
      const fresh = _events.filter(e => now - e.t < DURATION_MS)
      if (fresh.length !== _events.length) {
        _events = fresh
        _listeners.forEach(l => l(fresh))
      }
    }, 200)

    return () => {
      _listeners = _listeners.filter(l => l !== setEvents)
      clearInterval(pruner)
    }
  }, [])

  if (events.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {events.map(ev => {
        const screen = editor.pageToScreen({ x: ev.x, y: ev.y })
        return (
          <div
            key={ev.id}
            className="tlwar-dmg"
            style={{ left: screen.x, top: screen.y }}
          >
            -{Math.ceil(ev.amount)}
          </div>
        )
      })}
    </div>
  )
}
