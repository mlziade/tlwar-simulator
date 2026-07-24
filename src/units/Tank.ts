import { Unit } from './Unit'

export class Tank extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'tank', 200, 12, 40, 30, 0.5)
    this.radius = 24
  }
}
