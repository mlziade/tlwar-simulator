import { StateNode, createShapeId, type TLEventHandlers } from 'tldraw'
import { unitSize } from '../shapes/UnitShape'
import { unitMaxHp } from '../units/registry'
import { selectedUnitType } from '../ui/state'
import { PENCIL_SPAWN_INTERVAL } from '../constants'

export class PencilSpawnTool extends StateNode {
  static override id = 'pencil-spawn'

  private isDragging = false
  private lastSpawnPos: { x: number; y: number } | null = null

  override onEnter() {
    this.editor.setCursor({ type: 'cross' })
  }

  override onExit() {
    this.editor.setCursor({ type: 'default' })
  }

  override onPointerDown: TLEventHandlers['onPointerDown'] = () => {
    this.isDragging = false
    const pos = this.editor.inputs.currentPagePoint
    this.lastSpawnPos = { x: pos.x, y: pos.y }
  }

  override onPointerMove: TLEventHandlers['onPointerMove'] = () => {
    if (!this.editor.inputs.isDragging) return
    const current = this.editor.inputs.currentPagePoint
    if (!this.lastSpawnPos) return
    const d = Math.hypot(current.x - this.lastSpawnPos.x, current.y - this.lastSpawnPos.y)
    if (d >= PENCIL_SPAWN_INTERVAL) {
      this.spawnAt({ x: current.x, y: current.y })
      this.lastSpawnPos = { x: current.x, y: current.y }
      this.isDragging = true
    }
  }

  override onPointerUp: TLEventHandlers['onPointerUp'] = () => {
    if (!this.isDragging) {
      const pos = this.editor.inputs.currentPagePoint
      this.spawnAt({ x: pos.x, y: pos.y })
    }
    this.isDragging = false
    this.lastSpawnPos = null
  }

  private spawnAt(pos: { x: number; y: number }): void {
    const type = selectedUnitType.get()
    const size = unitSize(type)
    const maxHp = unitMaxHp(type)
    this.editor.createShape({
      id: createShapeId(),
      type: 'unit',
      x: pos.x - size.w / 2,
      y: pos.y - size.h / 2,
      props: { unitType: type, hp: maxHp, maxHp, team: 'unassigned', w: size.w, h: size.h },
    })
  }
}
