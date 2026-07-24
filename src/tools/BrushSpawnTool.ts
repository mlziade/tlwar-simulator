import { StateNode, createShapeId, type TLEventHandlers } from 'tldraw'
import { unitSize } from '../shapes/UnitShape'
import { unitMaxHp } from '../units/registry'
import { selectedUnitType, brushRadius, unitCount } from '../ui/state'
import { BRUSH_MIN_UNIT_DISTANCE } from '../constants'

export class BrushSpawnTool extends StateNode {
  static override id = 'brush-spawn'

  override onEnter() {
    this.editor.setCursor({ type: 'cross' })
  }

  override onExit() {
    this.editor.setCursor({ type: 'default' })
  }

  override onPointerDown: TLEventHandlers['onPointerDown'] = () => {
    const center = this.editor.inputs.currentPagePoint
    const R = brushRadius.get()
    const N = unitCount.get()
    const type = selectedUnitType.get()
    const size = unitSize(type)
    const maxHp = unitMaxHp(type)
    const placed: { x: number; y: number }[] = []

    let attempts = 0
    const maxAttempts = 50 * N

    while (placed.length < N && attempts < maxAttempts) {
      attempts++
      const angle = Math.random() * 2 * Math.PI
      const r = Math.random() * R
      const candidate = { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r }

      const tooClose = placed.some(
        p => Math.hypot(p.x - candidate.x, p.y - candidate.y) < BRUSH_MIN_UNIT_DISTANCE
      )
      if (!tooClose) placed.push(candidate)
    }

    this.editor.run(() => {
      for (const pos of placed) {
        this.editor.createShape({
          id: createShapeId(),
          type: 'unit',
          x: pos.x - size.w / 2,
          y: pos.y - size.h / 2,
          props: { unitType: type, hp: maxHp, maxHp, team: 'unassigned', w: size.w, h: size.h },
        })
      }
    })
  }
}
