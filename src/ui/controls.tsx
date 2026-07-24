import React, { useRef } from 'react'
import { useValue, useEditor, type TLShapeId } from 'tldraw'
import { simState, borderWarning, victoryTeam } from './state'
import { World } from '../simulation/world'
import { SimulationLoop } from '../simulation/loop'
import { NearestEnemyAI } from '../simulation/ai/nearestEnemy'
import { getZoneManager } from '../runtime'
import { Toolbar } from './toolbar'
import { ZoneToggle } from './zoneToggle'

export function Controls() {
  const editor = useEditor()
  const state = useValue(simState)
  const warning = useValue(borderWarning)
  const winner = useValue(victoryTeam)
  const loopRef = useRef<SimulationLoop | null>(null)

  function validateBorders(): boolean {
    const zm = getZoneManager()
    if (!zm) return false
    const shapes = editor.getCurrentPageShapes().filter(s => s.type === 'unit')
    for (const s of shapes) {
      const props = s.props as { w: number; h: number }
      const cx = s.x + (props.w ?? 0) / 2
      const cy = s.y + (props.h ?? 0) / 2
      if (zm.isOnBorder({ x: cx, y: cy })) {
        borderWarning.set(true)
        return false
      }
    }
    borderWarning.set(false)
    return true
  }

  function handlePlay() {
    if (!validateBorders()) return
    const zm = getZoneManager()
    if (!zm) return

    const world = new World(editor, zm)
    const loop = new SimulationLoop(editor, world, new NearestEnemyAI(), (team) => {
      victoryTeam.set(team)
      simState.set('idle')
    })
    loopRef.current = loop
    loop.start()
    simState.set('running')
  }

  function handlePause() {
    loopRef.current?.stop()
    simState.set('paused')
  }

  function handleClearAll() {
    loopRef.current?.stop()
    loopRef.current = null

    const unitIds = editor.getCurrentPageShapes()
      .filter(s => s.type === 'unit')
      .map(s => s.id as TLShapeId)
    if (unitIds.length > 0) editor.deleteShapes(unitIds)

    const zm = getZoneManager()
    if (zm) {
      zm.cleanup()
      zm.renderBorders()
    }

    simState.set('idle')
    borderWarning.set(false)
    victoryTeam.set(null)
  }

  const panelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    flexWrap: 'wrap',
    maxWidth: '100%',
    pointerEvents: 'all',
  }

  const actionBtn = (color: string, disabled = false): React.CSSProperties => ({
    padding: '5px 14px',
    borderRadius: 6,
    border: 'none',
    background: disabled ? '#ccc' : color,
    color: '#fff',
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  })

  return (
    <div style={panelStyle}>
      <Toolbar />

      <span style={{ width: 1, height: 24, background: '#ddd', margin: '0 4px' }} />

      <ZoneToggle />

      <span style={{ width: 1, height: 24, background: '#ddd', margin: '0 4px' }} />

      {(state === 'idle' || state === 'paused') && (
        <button
          style={actionBtn('#2e7d32', warning)}
          onClick={handlePlay}
          disabled={warning}
          title={warning ? 'Some units are on a zone border. Move or remove them first.' : 'Start simulation'}
        >
          Play
        </button>
      )}

      {state === 'running' && (
        <button style={actionBtn('#e65100')} onClick={handlePause}>
          Pause
        </button>
      )}

      <button style={actionBtn('#555')} onClick={handleClearAll}>
        Clear All
      </button>

      {warning && (
        <span style={{ fontSize: 11, color: '#c62828', maxWidth: 200 }}>
          Units on border — move them first.
        </span>
      )}

      {winner && (
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: winner === 'nobody' ? '#555' : '#1565C0',
          marginLeft: 4,
        }}>
          {winner === 'nobody' ? 'Draw!' : `Team ${winner} wins!`}
        </span>
      )}
    </div>
  )
}
