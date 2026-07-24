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

const chip = (active: boolean, disabled: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  border: active ? '1px solid #c7d9f0' : '1px solid #e8e8e8',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  fontSize: 12,
  background: active ? '#e8f0fb' : '#fff',
  color: active ? '#1565C0' : '#333',
  fontWeight: active ? 600 : 400,
})

const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#888' }

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
      <span style={label}>Unit</span>
      {UNIT_TYPES.map(t => (
        <button key={t} style={chip(unitType === t, running)} disabled={running} onClick={() => selectUnitType(t)}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}

      <span style={{ ...label, marginLeft: 4 }}>Tool</span>
      {TOOL_IDS.map(({ key, label: lbl, tldrawId }) => (
        <button key={key} style={chip(tool === key, running)} disabled={running} onClick={() => selectTool(key, tldrawId)}>
          {lbl}
        </button>
      ))}

      {tool === 'brush' && !running && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
            Radius
            <input type="range" min={20} max={200} step={10} value={radius}
              onChange={e => brushRadius.set(Number(e.target.value))}
              style={{ width: 70, marginLeft: 2 }} />
            <span style={{ fontSize: 11, color: '#555', minWidth: 28 }}>{radius}px</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888' }}>
            Count
            <input type="range" min={1} max={20} step={1} value={count}
              onChange={e => unitCount.set(Number(e.target.value))}
              style={{ width: 55, marginLeft: 2 }} />
            <span style={{ fontSize: 11, color: '#555', minWidth: 16 }}>{count}</span>
          </label>
        </span>
      )}
    </div>
  )
}
