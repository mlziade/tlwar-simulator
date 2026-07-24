import type { Unit } from '../../units/Unit'
import type { World } from '../world'

export type AIAction =
  | { type: 'move'; direction: { x: number; y: number } }
  | { type: 'attack'; target: Unit }
  | { type: 'idle' }

export interface AIAlgorithm {
  decide(unit: Unit, world: World): AIAction
}
