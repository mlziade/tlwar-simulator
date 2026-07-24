import { type Editor, type TLShapeId, createShapeId } from 'tldraw'
import { BORDER_TOLERANCE_PX, ZONE_LINE_EXTENT } from '../constants'

export class ZoneManager {
  private editor: Editor
  private zoneCount: 2 | 4 = 2
  private borderShapeIds: TLShapeId[] = []

  constructor(editor: Editor) {
    this.editor = editor
  }

  setZoneCount(count: 2 | 4): void {
    this.zoneCount = count
    this.cleanup()
    this.renderBorders()
  }

  getZoneCount(): 2 | 4 {
    return this.zoneCount
  }

  renderBorders(): void {
    const ids: TLShapeId[] = []
    const ext = ZONE_LINE_EXTENT

    const vId = createShapeId('zone-v')
    this.editor.createShape({
      id: vId,
      type: 'geo',
      x: -1,
      y: -ext,
      props: {
        geo: 'rectangle',
        w: 2,
        h: ext * 2,
        color: 'blue',
        fill: 'solid',
        dash: 'solid',
        size: 's',
      },
      isLocked: true,
      opacity: 0.25,
    })
    ids.push(vId)

    if (this.zoneCount === 4) {
      const hId = createShapeId('zone-h')
      this.editor.createShape({
        id: hId,
        type: 'geo',
        x: -ext,
        y: -1,
        props: {
          geo: 'rectangle',
          w: ext * 2,
          h: 2,
          color: 'blue',
          fill: 'solid',
          dash: 'solid',
          size: 's',
        },
        isLocked: true,
        opacity: 0.25,
      })
      ids.push(hId)
    }

    this.borderShapeIds = ids
    this.editor.sendToBack(ids)
  }

  getTeam(pos: { x: number; y: number }): string {
    if (this.zoneCount === 2) {
      return pos.x < 0 ? 'A' : 'B'
    }
    if (pos.x < 0 && pos.y < 0) return 'A'
    if (pos.x >= 0 && pos.y < 0) return 'B'
    if (pos.x < 0 && pos.y >= 0) return 'C'
    return 'D'
  }

  isOnBorder(pos: { x: number; y: number }): boolean {
    const onVertical = Math.abs(pos.x) <= BORDER_TOLERANCE_PX
    if (this.zoneCount === 2) return onVertical
    const onHorizontal = Math.abs(pos.y) <= BORDER_TOLERANCE_PX
    return onVertical || onHorizontal
  }

  cleanup(): void {
    if (this.borderShapeIds.length > 0) {
      this.editor.deleteShapes(this.borderShapeIds)
      this.borderShapeIds = []
    }
  }
}
