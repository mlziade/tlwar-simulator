import type { Editor, TLShapeId } from 'tldraw'
import { TICK_RATE } from '../constants'
import type { World } from './world'
import type { AIAlgorithm } from './ai/interface'

export class SimulationLoop {
  private accumulated = 0
  private _running = false

  constructor(
    private editor: Editor,
    private world: World,
    private ai: AIAlgorithm,
    private onVictory: (team: string) => void,
  ) {}

  start(): void {
    this._running = true
    this.editor.on('tick', this.onTick)
  }

  stop(): void {
    this._running = false
    this.editor.off('tick', this.onTick)
  }

  get running(): boolean {
    return this._running
  }

  private onTick = (elapsed: number): void => {
    this.accumulated += elapsed
    if (this.accumulated < TICK_RATE) return
    const dt = this.accumulated
    this.accumulated = 0

    const { world, ai, editor } = this
    const shapeUpdates: any[] = []
    const shapeDeletes: TLShapeId[] = []

    for (const unit of [...world.units]) {
      unit.onTick(dt)
    }

    for (const unit of [...world.units]) {
      if (!unit.isAlive) continue
      const action = ai.decide(unit, world)

      if (action.type === 'move') {
        const oldPos = { ...unit.position }
        unit.position.x += action.direction.x * unit.moveSpeed * (dt / 1000)
        unit.position.y += action.direction.y * unit.moveSpeed * (dt / 1000)
        world.spatialGrid.move(unit, oldPos)
        shapeUpdates.push({
          id: unit.shapeId as TLShapeId,
          type: 'unit',
          x: unit.position.x,
          y: unit.position.y,
        })
      } else if (action.type === 'attack') {
        action.target.takeDamage(unit.damage)
        unit.attackCooldownMs = 1000 / unit.attackSpeed

        if (!action.target.isAlive) {
          shapeDeletes.push(action.target.shapeId as TLShapeId)
          world.removeUnit(action.target)
        } else {
          shapeUpdates.push({
            id: action.target.shapeId as TLShapeId,
            type: 'unit',
            props: { hp: action.target.hp },
          })
        }
      }
    }

    editor.run(() => {
      if (shapeUpdates.length > 0) editor.updateShapes(shapeUpdates)
      if (shapeDeletes.length > 0) editor.deleteShapes(shapeDeletes)
    }, { history: 'ignore' })

    const winner = world.checkVictory()
    if (winner) {
      this.stop()
      this.onVictory(winner)
    }
  }
}
