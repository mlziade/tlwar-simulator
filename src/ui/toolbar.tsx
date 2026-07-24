import React from 'react'
import { useValue, useEditor } from 'tldraw'
import { simState, selectedUnitType, selectedTool, brushRadius, unitCount } from './state'
import type { UnitType } from '../units/registry'

const UNIT_TYPES: UnitType[] = ['warrior', 'tank', 'assassin']
const TOOL_IDS: { key: 'pencil' | 'brush' | 'delete'; label: string; tldrawId: string }[] = [
  { key: 'pencil', label: 'Pencil', tldrawId: 'pencil-spawn' },
  { key: 'brush',  label: 'Brush',  tldrawId: 'brush-spawn' },
  { key: 'delete', label: 'Delete', tldrawId: 'unit-delete' },
]

const dim: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }

function Chip({ active, disabled, onClick, children }: {
  active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '3px 9px',
        borderRadius: 5,
        border: active ? '1px solid rgba(120,180,255,0.55)' : '1px solid rgba(255,255,255,0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.38 : 1,
        fontSize: 11,
        background: active ? 'rgba(21,101,192,0.45)' : 'rgba(255,255,255,0.05)',
        fontWeight: active ? 700 : 400,
        color: active ? '#90caf9' : 'rgba(255,255,255,0.7)',
        transition: 'background 0.1s, border-color 0.1s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const editor = useEditor()
  const state = useValue(simState)
  const unitType = useValue(selectedUnitType)
  const tool = useValue(selectedTool)
  const radius = useValue(brushRadius)
  const count = useValue(unitCount)
  const running = state === 'running'

  function selectUnitType(t: UnitType) {
    if (running) return
    selectedUnitType.set(t)
  }

  function selectTool(key: 'pencil' | 'brush' | 'delete', tldrawId: string) {
    if (running) return
    selectedTool.set(key)
    editor.setCurrentTool(tldrawId)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={dim}>Unit</span>
      {UNIT_TYPES.map(t => (
        <Chip key={t} active={unitType === t} disabled={running} onClick={() => selectUnitType(t)}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </Chip>
      ))}

      <span style={{ ...dim, marginLeft: 6 }}>Tool</span>
      {TOOL_IDS.map(({ key, label, tldrawId }) => (
        <Chip key={key} active={tool === key} disabled={running} onClick={() => selectTool(key, tldrawId)}>
          {label}
        </Chip>
      ))}

      {tool === 'brush' && !running && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
            R
            <input
              type="range" min={20} max={200} step={10} value={radius}
              onChange={e => brushRadius.set(Number(e.target.value))}
              style={{ width: 55, accentColor: '#90caf9' }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)', minWidth: 26 }}>{radius}</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
            N
            <input
              type="range" min={1} max={20} step={1} value={count}
              onChange={e => unitCount.set(Number(e.target.value))}
              style={{ width: 45, accentColor: '#90caf9' }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)', minWidth: 16 }}>{count}</span>
          </label>
        </span>
      )}
    </div>
  )
}
