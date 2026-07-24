import { Unit } from './Unit'

export class Assassin extends Unit {
  constructor(team: string, position: { x: number; y: number }) {
    super(team, position, 'assassin', 60, 45, 3, 144, 2.4)
    this.radius = 12
  }
}
