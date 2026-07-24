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

const btnStyle = (active: boolean, disabled: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  border: active ? '2px solid #1565C0' : '1px solid #ccc',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  fontSize: 12,
  background: active ? '#e3eef9' : '#fff',
  fontWeight: active ? 600 : 400,
})

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#555' }}>Unit:</span>
      {UNIT_TYPES.map(t => (
        <button
          key={t}
          style={btnStyle(unitType === t, running)}
          onClick={() => selectUnitType(t)}
          disabled={running}
        >
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}

      <span style={{ fontSize: 11, fontWeight: 600, color: '#555', marginLeft: 8 }}>Tool:</span>
      {TOOL_IDS.map(({ key, label, tldrawId }) => (
        <button
          key={key}
          style={btnStyle(tool === key, running)}
          onClick={() => selectTool(key, tldrawId)}
          disabled={running}
        >
          {label}
        </button>
      ))}

      {tool === 'brush' && !running && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <label style={{ fontSize: 11, color: '#555' }}>
            Radius:
            <input
              type="range"
              min={20}
              max={200}
              step={10}
              value={radius}
              onChange={e => brushRadius.set(Number(e.target.value))}
              style={{ width: 70, marginLeft: 4 }}
            />
            <span style={{ marginLeft: 4, fontSize: 11 }}>{radius}px</span>
          </label>
          <label style={{ fontSize: 11, color: '#555', marginLeft: 6 }}>
            Count:
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={count}
              onChange={e => unitCount.set(Number(e.target.value))}
              style={{ width: 60, marginLeft: 4 }}
            />
            <span style={{ marginLeft: 4, fontSize: 11 }}>{count}</span>
          </label>
        </span>
      )}
    </div>
  )
}
