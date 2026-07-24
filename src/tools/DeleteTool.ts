import { StateNode, type TLEventHandlers } from 'tldraw'

export class DeleteTool extends StateNode {
  static override id = 'unit-delete'

  override onEnter() {
    this.editor.setCursor({ type: 'cross' })
  }

  override onExit() {
    this.editor.setCursor({ type: 'default' })
  }

  override onPointerDown: TLEventHandlers['onPointerDown'] = () => {
    const point = this.editor.inputs.currentPagePoint
    const shape = this.editor.getShapeAtPoint(point)
    if (shape && shape.type === 'unit') {
      this.editor.deleteShape(shape.id)
    }
  }
}
