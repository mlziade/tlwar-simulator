import { Unit } from './Unit'

export class Tank extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'tank', 250, 8, 30, 30, 0.5)
  }
}
