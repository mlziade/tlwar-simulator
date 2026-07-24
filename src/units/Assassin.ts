import { Unit } from './Unit'

export class Assassin extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'assassin', 60, 45, 3, 120, 2.0)
    this.radius = 12
  }
}
